import { _Typedebuffs } from "../../../constants/game";
import DepthUtils from "../../../utils/depth";
import { PositionManager } from "../../managers/view/PositionManager";
import type { Game } from "../../scenes/Game";
import { CollisionContext } from "../../types";
import PlantHelper from "../../utils/helper/PlantHelper";
import { CombatEntity } from "../core/CombatEntity";
import { MonsterEntity } from "../entities/MonsterEntity";
import { PlantEntity } from "../entities/PlantEntity";
import { ProjectileEntity } from "../entities/ProjectileEntity";
import { BulletConfig, BulletModel } from "./ProjectileModels";


export class BulletEntity extends ProjectileEntity<BulletModel> {
  public baseDepth: number;
  public currentPenetrate: number;
  public penetratePower: number;
  public penetratedPunish: number;
  hasPenetrated: Set<CombatEntity> = new Set(); // 记录已经穿透过的实体，避免重复穿透同一实体
  public sprite!: Phaser.GameObjects.Sprite;

  private prevX = 0; // 上一帧的x坐标，用于计算飞行距离
  private traveledDistanceX: number = 0; // 已经飞行的x距离
  private maxDistanceX: number; // 最大飞行x坐标距离

  bounceable: boolean = true; // 是否可以被反弹
  speed: number

  skipTiny: boolean; // 是否跳过小型单位，默认为true

  constructor(scene: Game, col: number, row: number, model: BulletModel, cfg: BulletConfig) {
    const { x, y } = PositionManager.Instance.getBulletCenter(col, row);
    super(scene, x, y, model, cfg);
    this.currentDamage = cfg.damage;
    this.bounceable = cfg.bounceable ?? true;

    this.traveledDistanceX = 0;
    this.prevX = x;
    this.maxDistanceX = (cfg.maxDistance ?? 128) * PositionManager.Instance.GRID_SIZEX; // 默认无限飞行
    this.speed = cfg.speed ?? model.speed;

    this.currentPenetrate = 0;
    this.hasPenetrated = new Set<CombatEntity>();
    this.penetratePower = cfg.penetratePower ?? model.penetratePower;
    this.penetratedPunish = cfg.penetratedPunish ?? model.penetratedPunish;

    this.skipTiny = cfg.skipTiny ?? true;

    // 视觉
    this.baseDepth = DepthUtils.getProjectileDepth('bullet', col);
    this.sprite = scene.add.sprite(this.x, this.y, model.texture);
    const size = PositionManager.Instance.getBulletDisplaySize();
    this.sprite.setDisplaySize(size.sizeX, size.sizeY);
    this.sprite.setDepth(this.baseDepth);
    this.viewGroup.add(this.sprite);

    // 物理
    const bodySize = PositionManager.Instance.getBulletBodySize();
    this.createSensor(bodySize.sizeX, bodySize.sizeY);

    // 赋予速度
    this.rigidBody?.setLinvel({ x: this.speed, y: 0 }, true);
  }

  buildView() { }

  stepUpdate() {
    super.stepUpdate();

    // 超出屏幕销毁
    const screenWidth = this.scene.sys.canvas.width;
    const screenHeight = this.scene.sys.canvas.height;
    if (this.x > screenWidth * 2 || this.x < -screenWidth * 1 ||
      this.y > screenHeight * 2 || this.y < -screenHeight * 1
    ) {
      this.destroy();
      return;
    }

    // 超出最大飞行距离销毁
    const deltaX = Math.abs(this.x - this.prevX);
    this.traveledDistanceX += deltaX;
    this.prevX = this.x;
    if (this.traveledDistanceX >= this.maxDistanceX) {
      this.destroy();
      return;
    }

    // 根据速度反转贴图
    if (this.rigidBody) {
      const vx = this.rigidBody.linvel().x;
      this.sprite.setFlipX(vx < 0);
    }
  }

  // 被反弹的方法
  public reverseVelocityX(): void {
    if (!this.bounceable) return; // 不可反弹的子弹直接返回
    if (this.rigidBody) {
      const vel = this.rigidBody.linvel();
      this.rigidBody.setLinvel({ x: -vel.x, y: vel.y }, true);
    }
  }

  // 重载碰撞分发器，实现穿透和优先级逻辑
  override onCollision(ctx: CollisionContext): void {
    // 判断是否为战斗实体
    if (!(ctx.targetEntity instanceof CombatEntity)) return;

    // 基本条件过滤
    if (!ctx.targetEntity.takeDamage) return; // 不是可受击对象
    if (this.hasAttacked.has(ctx.targetEntity)) return; // 已经攻击过
    if (ctx.targetEntity.faction === this.faction) return; // 阵营不符

    // 高度/飞行逻辑判断
    if (this.skipTiny && ctx.targetEntity.isTiny) return; // 跳过小型单位
    if (this.couldAttackFlying === false) {
      if (ctx.targetEntity instanceof MonsterEntity &&
        ctx.targetEntity.isFlying) return; // 地面子弹打不到天上
    }

    // 虚空/黑夜逻辑
    if (ctx.targetEntity instanceof MonsterEntity && ctx.targetEntity.isInVoid) return;

    // 只能说明可能可以攻击，还要看穿透逻辑
    const target = ctx.targetEntity as CombatEntity;
    if (this.hasPenetrated.has(target) ||
      this.currentPenetrate > this.penetratePower) return; // 已经穿透过了
    // 递归地穿透最高优先级的植物
    const penetrateHighestPriorityPlant = (plants: PlantEntity[], currentTarget: PlantEntity): void => {
      // 递归退出条件：已穿透此目标，或穿透力已用尽
      if (this.hasPenetrated.has(currentTarget) ||
        this.currentPenetrate > this.penetratePower) {
        return;
      }

      // 对当前植物造成伤害
      this.applyEffect(currentTarget);

      // 穿透力已用尽，销毁子弹
      if (this.currentPenetrate > this.penetratePower) {
        this.destroy();
        return;
      }

      // 查找比当前植物优先级更高的未穿透植物
      const nextTarget = plants.find(
        plant => plant !== currentTarget &&
          !this.hasPenetrated.has(plant) &&
          PlantHelper.IsMorePriorityPlant(plant, currentTarget)
      );

      // 如果找到更高优先级的植物，继续递归穿透
      if (nextTarget) {
        penetrateHighestPriorityPlant(plants, nextTarget);
      }
    };

    if (target instanceof PlantEntity) {
      const row = target.row;
      const col = target.col;
      const plants = [...PlantHelper.GetPlantsInGrid(col, row)];

      // 递归穿透最高优先级的植物
      penetrateHighestPriorityPlant(plants, target);
      return;
    }

    this.applyEffect(target);
    return;
  }

  // 尝试对碰撞体造成伤害
  protected applyEffect(t: CombatEntity): void {
    this.currentPenetrate++;
    this.hasPenetrated.add(t);

    // 造成伤害
    this.hasAttacked.add(t);
    t.takeDamage(this.currentDamage, this.dealer, this);

    // debuff
    if (this.debuff) {
      t.addDebuff(this.debuff, this.debuffDuration);
    }

    // 穿透衰减
    if (this.currentPenetrate <= this.penetratePower) {
      this.currentDamage = Math.floor(this.currentDamage * this.penetratedPunish);
    } else {
      this.destroy();
    }
  }
}