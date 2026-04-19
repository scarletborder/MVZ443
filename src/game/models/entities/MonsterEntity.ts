import RAPIER from "@dimforge/rapier2d-deterministic-compat";
import DepthUtils from "../../../utils/depth";
import { defaultRandom } from "../../../utils/random";
import { FrameTimer } from "../../managers/combat/TickerManager";
import { Game } from "../../scenes/Game";
import { CollisionContext } from "../../types";
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
import { BaseEntity } from "../core/BaseEntity";

export abstract class MonsterEntity extends CombatEntity {
  declare public scene: Game;
  public model: MonsterModel;
  public waveID: number;

  public col: number;
  public row: number;
  declare public x: number;
  declare public y: number;
  public baseDepth: number;

  public health: number;
  public speed: number;
  public originalSpeed: number;
  public isFlying = false;
  public isInVoid = false;
  public isDying = false;
  public isFrozen = false;
  public isStop = false;

  public carryStarShards = false;
  public attacking: CombatEntity | null = null;
  protected attackTimer: FrameTimer | null = null;
  protected debuffs: { [key: string]: { remaining: number, timer: FrameTimer } } = {};

  public animController!: IMonsterAnimController;
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

    this.offsetX = defaultRandom() * PositionManager.Instance.GRID_SIZEX / 5;
    this.offsetY = defaultRandom() * PositionManager.Instance.GRID_SIZEY / 10;
    this.baseDepth = DepthUtils.getZombieBasicDepth(row, this.offsetY);

    this.health = model.maxHealth;
    this.originalSpeed = model.baseSpeed * PositionManager.Instance.scaleFactor * 0.9;
    this.speed = this.originalSpeed;
    this.isFlying = model.isDefaultFlying;
    this.isInVoid = model.isDefaultInVoid;
    this.viewGroup = scene.add.group();

    this.buildView();
    this.checkAndAddBoat();
    this.buildPhysics();

    MobManager.Instance.registerMonster(this);
    this.playSpawnAudio();
    this.startMove();
    this.model.onCreate(this);
  }

  protected abstract buildView(): void;

  private buildPhysics() {
    const size = PositionManager.Instance.getZombieBodySize();
    const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased().setTranslation(this.x, this.y);
    rigidBodyDesc.setUserData(this);
    this.rigidBody = this.scene.rapierWorld.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(size.sizeX / 2, (size.sizeY * 0.9) / 2);
    colliderDesc.setSensor(true);
    colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    this.scene.rapierWorld.createCollider(colliderDesc, this.rigidBody);
  }

  public override updateView(vec: { x: number, y: number }) {
    if (this.isDying) return;
    this.x = vec.x;
    this.y = vec.y;

    if (!this.animController.isInAnim) {
      this.animController.updatePosition(this.x + this.offsetX, this.y + this.offsetY);
    }

    this.attachSprites.forEach((sprite) => {
      sprite.x = this.x + this.offsetX;
    });
  }

  public override stepUpdate() {
    if (this.x < -PositionManager.Instance.GRID_SIZEX) {
      this.destroy();
      CombatManager.Instance.EndGame(false);
    }
  }

  protected setVelocityX(vx: number) {
    if (!this.rigidBody || this.isDying) return;
    this.rigidBody.setLinvel({ x: vx, y: 0 }, true);
  }

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

    if (target instanceof MonsterEntity) {
      if (target.isFlying && !this.isFlying) return;
      if (target.isInVoid) return;
    }

    if (this.attacking instanceof PlantEntity && target instanceof PlantEntity) {
      if (PlantHelper.IsMorePriorityPlant(this.attacking, target)) {
        this.notifyTargetStopAttacked();
      }
    }

    this.attacking = target;
    this.isStop = true;
    this.stopMove();
    target.underAttackBy.add(this);
    this.animController.startArmSwing();

    this.attackTimer = this.tickmanager.addEvent({
      startAt: this.model.attackInterval * 0.9,
      delay: this.model.attackInterval,
      callback: () => this.hurtTarget(),
      loop: true,
    });
  }

  public stopAttacking() {
    this.notifyTargetStopAttacked();
    this.animController.stopArmSwing();
    this.attackTimer?.remove();
    this.attackTimer = null;
    this.isStop = false;
    this.startMove();
  }

  protected hurtTarget() {
    if (this.attacking && this.attacking.currentHealth > 0) {
      this.attacking.takeDamage(this.model.attackDamage, this);
      if (this.attacking.currentHealth <= 0) {
        this.stopAttacking();
      }
      return;
    }
    this.stopAttacking();
  }

  protected notifyTargetStopAttacked() {
    this.attacking?.underAttackBy.delete(this);
    this.attacking = null;
  }

  public override takeDamage(amount: number, dealer?: BaseEntity, source?: BaseEntity): void {
    if (this.currentHealth <= 0 || this.isDying) return;

    const realDamage = Math.min(amount, this.currentHealth);
    this.currentHealth -= amount;
    this.health = this.currentHealth;
    this.model.onHurt(this, amount, realDamage, dealer, source);

    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.health = 0;
      this.ZombieDie();
    }
  }

  public onCollision(ctx: CollisionContext) {
    if (ctx.targetEntity instanceof CombatEntity && ctx.targetEntity.faction !== this.faction) {
      this.startAttacking(ctx.targetEntity);
    }
  }

  public ZombieDie() {
    if (this.isDying) return;
    this.stopAttacking();
    this.playDeathAnimation();
    this.tickmanager.delayedCall({
      delay: 300,
      callback: () => this.destroy(),
    });
  }

  protected playDeathAnimation() {
    this.isDying = true;
    this.stopMove();

    if (this.rigidBody) {
      this.scene.rapierWorld.removeRigidBody(this.rigidBody);
      this.rigidBody = null;
    }

    this.scene.tweens.add({
      targets: this.viewGroup.getChildren(),
      angle: 90,
      duration: 400,
      ease: "Linear",
      onComplete: () => this.playDeathSmokeAnimation(),
    });
  }

  private checkAndAddBoat() {
    if (GridManager.Instance.RowPropertyRatio(this.row, "water") > 0) {
      const boatY = this.y + 15 * PositionManager.Instance.scaleFactor;
      const boat1 = this.scene.add.sprite(this.x, boatY, "attach/boat1")
        .setScale(PositionManager.Instance.scaleFactor * 1.4)
        .setOrigin(0.5, 1)
        .setDepth(this.baseDepth - 2);
      const boat2 = this.scene.add.sprite(this.x, boatY, "attach/boat2")
        .setScale(PositionManager.Instance.scaleFactor * 1.4)
        .setOrigin(0.5, 1)
        .setDepth(this.baseDepth + 10);
      this.attachSprites.set("boat1", boat1);
      this.attachSprites.set("boat2", boat2);
      this.viewGroup.addMultiple([boat1, boat2]);
    }
  }

  protected playSpawnAudio() {
    const idx = Math.floor(Math.random() * 3) + 1;
    this.scene.musical.zombieSpawnAudio.play(`zombieSpawn${idx}`);
  }

  protected playDeathSmokeAnimation() {
    this.scene.musical.zombieDeathPool.play();
    const smoke = this.scene.add.sprite(this.x, this.y, "anime/death_smoke")
      .setDisplaySize(100, 100)
      .setOrigin(0.5, 1)
      .setDepth(this.baseDepth + 15);
    smoke.play("death_smoke");
    smoke.once("animationcomplete", () => smoke.destroy());
  }

  public override destroy() {
    this.model.onDeath(this);
    MobManager.Instance.registerDestroy(this);
    this.animController.destroy();
    this.attachSprites.forEach((sprite) => sprite.destroy());
    super.destroy();
  }
}
