import RAPIER, { Vector } from "@dimforge/rapier2d-deterministic-compat";
import PlantsManager from "../../managers/combat/PlantsManager";
import { PositionManager } from "../../managers/view/PositionManager";
import type { Game } from "../../scenes/Game";
import { CombatEntity } from "../core/CombatEntity";
import { Faction } from "../Enum";
import { PlantModel } from "../PlantModel";
import DepthUtils from "../../../utils/depth";
import CombatManager from "../../managers/CombatManager";
import { CollisionContext } from "../../types";
import { BaseEntity } from "../core/BaseEntity";

// entities/PlantEntity.ts
export abstract class PlantEntity extends CombatEntity {
  public model: PlantModel; // 挂载蓝图数据

  public col: number;
  public row: number;

  public level: number;
  public baseDepth: number;

  // 运行时状态
  declare public currentHealth: number;
  declare public maxHealth: number;
  public isSleeping: boolean = false;

  // 表现层容器（替代原有的 extends Sprite）
  declare public viewGroup: Phaser.GameObjects.Group;

  // 睡眠特效
  private sleepingText: Phaser.GameObjects.Text | null = null;
  private sleepingTween: Phaser.Tweens.Tween | null = null;
  private initialized = false;

  constructor(scene: Game, col: number, row: number, model: PlantModel, level: number) {
    const { x, y } = PositionManager.Instance.getPlantBottomCenter(col, row);

    // 传入模型计算出的血量，并指定为 PLANT 阵营
    const hp = model.maxHealth.getValueAt(level);
    super(scene, x, y, hp, Faction.PLANT);
    this.model = model;
    this.baseDepth = DepthUtils.getPlantBasicDepth(row);

    this.col = col;
    this.row = row;
    this.level = level;
  }

  public get pid() {
    return this.model.pid;
  }

  private buildPhysics() {
    const physicBodySize = PositionManager.Instance.getPlantBodySize();
    const physicsCenter = PositionManager.Instance.getPlantBodyCenterByBottom(this.x, this.y);
    const hitbox = this.scene.add.zone(physicsCenter.x, physicsCenter.y, physicBodySize.sizeX, physicBodySize.sizeY).setOrigin(0.5, 0.5);
    this.viewGroup.add(hitbox);
    // 配置 Rapier 物理描述
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic() // 或 kinematicPositionBased()
      .setTranslation(physicsCenter.x, physicsCenter.y);

    rigidBodyDesc.setUserData(this);

    this.rigidBody = this.scene.rapierWorld.createRigidBody(rigidBodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(physicBodySize.sizeX / 2, physicBodySize.sizeY / 2);
    // 【关键2】: 设为传感器 (Sensor)，这样就不会发生物理阻挡，只会触发事件
    colliderDesc.setSensor(true);
    // 【关键3】: 激活碰撞事件监听
    colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    this.scene.rapierWorld.createCollider(colliderDesc, this.rigidBody);
  }

  // 由具体子类覆盖，或者根据 Model 决定如何构建图像
  protected abstract buildView(): void;

  public initializeEntity(): this {
    if (this.initialized) return this;
    this.initialized = true;

    this.buildView();
    this.buildPhysics();

    PlantsManager.Instance.RegisterPlant(this);

    this.isTiny = this.model.isTiny;
    if (this.model.isNightPlant && CombatManager.Instance.combatStatus.dayOrNight === true) {
      this.setSleeping(true);
    }
    this.model.onCreate(this);
    return this;
  }

  public takeDamage(amount: number, dealer?: BaseEntity, source?: BaseEntity) {
    this.scene.musical.plantAudio.play('plantHit');
    super.takeDamage(amount, dealer, source);
  }

  public onHurt(amount: number, realDamage: number, dealer?: BaseEntity, source?: BaseEntity): void {
    this.model.onHurt(this, amount, realDamage, dealer, source);
  }

  public useStarShards() {
    this.model.onStarShards(this);
    // TODO: sfx ... 星星四散的通用UI特效可以在这里统一播放 ...
  }

  onDeath() {
    this.model.onDeath(this);
  }

  onCollision(_ctx: CollisionContext): void {
    // 植物碰到，不在植物这里处理
  }

  public updateView(vec: Vector) {
    // 计算物理引擎带来的坐标位移量 (Delta)
    const nextPosition = PositionManager.Instance.getPlantBottomCenterByBody(vec.x, vec.y);
    const dx = nextPosition.x - this.x;
    const dy = nextPosition.y - this.y;

    // 如果没有发生移动，则直接跳过，节省性能
    if (dx === 0 && dy === 0) return;

    // 更新基类当前的绝对坐标
    this.x = nextPosition.x;
    this.y = nextPosition.y;

    // 遍历所有部件，并给它们加上偏移量
    const children = this.viewGroup.getChildren();
    for (let i = 0; i < children.length; i++) {
      const part = children[i] as any;
      if (!part) continue;

      // 对于其它所有视觉部件（底座、头部等），使用增量叠加！
      // 这种做法的巨大优势是：即使此时正在被 Tween 控制向左平移（开火动画），
      // 增量也能完美保留它的相对动画，不会产生任何抽搐或坐标冲突。
      part.x += dx;
      part.y += dy;
    }

    // 同步睡眠文本特效的坐标
    if (this.sleepingText) {
      this.sleepingText.x += dx;
      this.sleepingText.y += dy;
    }

    // 如果你需要支持植物倾倒（被物理引擎砸歪），也可以在此处引入 rotation 的同步
  }

  public destroy() {
    this.currentHealth = 0;
    for (const attacker of [...this.underAttackBy]) {
      if (typeof (attacker as { stopAttacking?: () => void }).stopAttacking === "function") {
        attacker.stopAttacking?.();
      }
    }
    this.underAttackBy.clear();
    this.model.onDeath(this);
    // 清理所有绑定的事件和定时器

    // 通知Manager移除自己
    PlantsManager.Instance.RegisterDestroy(this);
    super.destroy(); // 调用父类的destroy，清理实体
  }

  public setSleeping(value: boolean): void {
    this.isSleeping = value;
    this.model.onSleepStateChange(this, value);
    // TODO: sleeping sfx
  }
}
