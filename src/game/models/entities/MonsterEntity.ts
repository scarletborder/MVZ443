
import RAPIER from "@dimforge/rapier2d-deterministic-compat";
import DepthUtils from "../../../utils/depth";
import { defaultRandom } from "../../../utils/random";
import { PhaserEventBus, PhaserEvents } from "../../EventBus";
import { FrameTimer } from "../../managers/combat/TickerManager";
import { Game } from "../../scenes/Game";
import { CollisionContext } from "../../types";
import { IPlant } from "../IPlant";
import { IMonsterAnimController } from "../monster/anims/IMonsterAnimController";
import { MonsterModel } from "../MonsterModel";
import { PositionManager } from "../../managers/view/PositionManager";
import MobManager from "../../managers/combat/MobManager";
import { CombatEntity } from "../core/CombatEntity";
import { Faction } from "../Enum";
import CombatManager from "../../managers/CombatManager";
import GridManager from "../../managers/combat/GridManager";
import PlantHelper from "../../utils/helper/PlantHelper";
import { PlantEntity } from "./PlantEntity";


export abstract class MonsterEntity extends CombatEntity {
  declare public scene: Game;
  public model: MonsterModel;
  public waveID: number;

  public col: number;
  public row: number;
  declare public x: number;
  declare public y: number;
  public baseDepth: number;

  // 状态数据
  public health: number;
  public speed: number;
  public originalSpeed: number;
  public isFlying: boolean = false;
  public isInVoid: boolean = false;
  public isDying: boolean = false;
  public isFrozen: boolean = false;
  public isStop: boolean = false;

  public carryStarShards: boolean = false;

  // 战斗相关
  public attacking: CombatEntity | null = null; // 正在攻击的目标

  // CAUTION: timer 必须全部用 timerkey
  protected attackTimer: FrameTimer | null = null;

  protected debuffs: { [key: string]: { remaining: number, timer: FrameTimer } } = {};

  // 表现层与物理
  public animController!: IMonsterAnimController; // 由子类在 buildView 中赋值
  public viewGroup: Phaser.GameObjects.Group;
  public attachSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

  public offsetX: number;
  public offsetY: number;

  constructor(scene: Game, col: number, row: number, model: MonsterModel, waveID: number) {
    const pos = PositionManager.Instance.getZombieBottomCenter(col, row);
    super(scene, pos.x, pos.y, model.maxHealth, Faction.ZOMBIE);
    this.model = model;
    this.col = col;
    this.row = row;
    this.waveID = waveID;

    // 微小偏移防止视觉重叠
    this.offsetX = defaultRandom() * PositionManager.Instance.GRID_SIZEX / 5;
    this.offsetY = defaultRandom() * PositionManager.Instance.GRID_SIZEY / 10;
    this.baseDepth = DepthUtils.getZombieBasicDepth(row, this.offsetY);

    this.health = model.maxHealth;
    this.originalSpeed = model.baseSpeed * PositionManager.Instance.scaleFactor * 0.9;
    this.speed = this.originalSpeed;

    this.isFlying = model.isDefaultFlying;
    this.isInVoid = model.isDefaultInVoid;

    this.viewGroup = scene.add.group();

    // 1. 构建表现层 (由子类实现)
    this.buildView();
    this.checkAndAddBoat();

    // 2. 构建物理层 (基于 RAPIER 的 KinematicVelocityBased + Sensor)
    this.buildPhysics();

    // 3. 注册到管理器并播放音效
    MobManager.Instance.registerMonster(this);
    this.playSpawnAudio();

    // 4. 启动移动
    this.startMove();
  }

  protected abstract buildView(): void;

  private buildPhysics() {
    const size = PositionManager.Instance.getZombieBodySize();
    // 关键1：Kinematic 允许我们控制速度，但不受物理推挤影响
    const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased()
      .setTranslation(this.x, this.y);

    // 关键2：绑定实体，方便碰撞回调反查
    rigidBodyDesc.setUserData(this);

    this.rigidBody = this.scene.rapierWorld.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(size.sizeX / 2, (size.sizeY * 0.9) / 2);
    // 关键3：设为传感器，只触发事件，不产生碰撞阻力
    colliderDesc.setSensor(true);
    colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    this.scene.rapierWorld.createCollider(colliderDesc, this.rigidBody);
  }

  // --- 核心物理与坐标同步 ---

  public updateView(vec: { x: number, y: number }) {
    if (this.isDying) return;
    this.x = vec.x;
    this.y = vec.y;

    // 同步复杂动画部件的位置 (只在没有播放特殊不可打断动画时更新)
    if (!this.animController.isInAnim) {
      this.animController.updatePosition(this.x + this.offsetX, this.y + this.offsetY);
    }

    // 同步附属物 (如船)
    this.attachSprites.forEach(sprite => {
      sprite.x = this.x + this.offsetX;
    });


  }

  stepUpdate() {
    // 处理出界逻辑
    // 矿车可以被碰撞,如果丢,早丢了
    if (this.x < -PositionManager.Instance.GRID_SIZEX * 1) {
      this.destroy();
      CombatManager.Instance.EndGame(false);
    }
  }

  protected setVelocityX(vx: number) {
    if (!this.rigidBody || this.isDying) return;
    this.rigidBody.setLinvel({ x: vx, y: 0 }, true);
  }

  // --- 移动与攻击系统 ---

  public startMove() {
    if (this.isFrozen || this.isStop || this.isDying) return;
    this.setVelocityX(-this.speed);
    this.animController.startLegSwing();
  }

  public stopMove() {
    this.setVelocityX(0);
    this.animController.stopLegSwing();
  }

  public startAttacking(target: CombatEntity) {
    if (this.isFrozen || this.attacking === target) return;

    // 他在飞，我不在飞
    if (target instanceof MonsterEntity) {
      if (target.isFlying && !this.isFlying) return;
      if (target.isInVoid) return;
    }

    // 更换优先级更高的目标
    if (this.attacking instanceof PlantEntity && target instanceof PlantEntity) {
      if (
        PlantHelper.IsMorePriorityPlant(
          this.attacking, target
        )
      )
        this.notifyPlantStopAttacked();
    }

    this.attacking = target;
    this.isStop = true;
    this.stopMove();
    target.underAttackBy.add(this);

    this.animController.startArmSwing();

    this.attackTimer = this.tickmanager.addEvent({
      startAt: this.model.attackInterval * 0.9,
      delay: this.model.attackInterval,
      callback: () => this.hurtPlant(),
      loop: true,
    });
  }

  public stopAttacking() {
    this.notifyPlantStopAttacked();
    this.animController?.stopArmSwing();
    if (this.attackTimer) {
      this.attackTimer.remove();
      this.attackTimer = null;
    }
    this.isStop = false;
    this.startMove();
  }

  private hurtPlant() {
    if (this.attacking && this.attacking.currentHealth > 0) {
      this.attacking.takeDamage(this.model.attackDamage, this);
      if (this.attacking.currentHealth <= 0) this.stopAttacking();
    } else {
      this.stopAttacking();
    }
  }

  private notifyPlantStopAttacked() {
    this.attacking?.underAttackBy.delete(this);
    this.attacking = null;
  }

  // --- 受击与状态 ---

  public takeDamage(amount: number) {
    this.health -= amount;
    this.animController.highlight();
    if (this.health <= 0) {
      this.ZombieDie();
    } else if (amount > 10) {
      this.scene.musical.generalHitAudio.play('generalHit');
    }
  }

  // --- 碰撞回调钩子 ---
  public onCollision(ctx: CollisionContext) {
    if (ctx.targetEntity instanceof CombatEntity &&
      ctx.targetEntity.faction !== this.faction
    ) {
      this.startAttacking(ctx.targetEntity as CombatEntity);
    }

  }

  public ZombieDie() {
    if (this.isDying) return;
    this.stopAttacking();
    this.playDeathAnimation();
    this.tickmanager.delayedCall({
      delay: 300,
      callback: () => {
        this.destroy();
      }
    });
  }

  protected playDeathAnimation() {
    this.isDying = true;
    this.stopMove();

    if (this.rigidBody) {
      this.scene.rapierWorld.removeRigidBody(this.rigidBody);
    }

    // 基类提供的默认死亡动画：90度倒下
    this.scene.tweens.add({
      targets: this.viewGroup.getChildren(), // 将所有试图组件翻转
      angle: 90,
      duration: 400,
      ease: 'Linear',
      onComplete: () => {
        this.playDeathSmokeAnimation();
      }
    });
  }

  private checkAndAddBoat() {
    if (GridManager.Instance.RowPropertyRatio(this.row, 'water') > 0) {
      const boaty = this.y + 15 * PositionManager.Instance.scaleFactor;

      const boat1 = this.scene.add.sprite(this.x, boaty, 'attach/boat1')
        .setScale(PositionManager.Instance.scaleFactor * 1.4).setOrigin(0.5, 1).setDepth(this.baseDepth - 2);

      const boat2 = this.scene.add.sprite(this.x, boaty, 'attach/boat2')
        .setScale(PositionManager.Instance.scaleFactor * 1.4).setOrigin(0.5, 1).setDepth(this.baseDepth + 10);

      this.attachSprites.set('boat1', boat1);
      this.attachSprites.set('boat2', boat2);
      this.viewGroup.addMultiple([boat1, boat2]);
    }
  }

  private playSpawnAudio() {
    const idx = Math.floor(Math.random() * 3) + 1;
    this.scene.musical.zombieSpawnAudio.play(`zombieSpawn${idx}`);
  }

  private playDeathSmokeAnimation() {
    this.scene.musical.zombieDeathPool.play();
    const smoke = this.scene.add.sprite(this.x, this.y, 'anime/death_smoke')
      .setDisplaySize(100, 100).setOrigin(0.5, 1).setDepth(this.baseDepth + 15);
    smoke.play('death_smoke');
    smoke.once('animationcomplete', () => smoke.destroy());
  }

  public destroy() {
    MobManager.Instance.registerDestroy(this);

    this.animController.destroy();
    this.attachSprites.forEach(s => s.destroy());

    if (this.carryStarShards) {
      PhaserEventBus.emit(PhaserEvents.StarShardsGet);
    }
  }
}