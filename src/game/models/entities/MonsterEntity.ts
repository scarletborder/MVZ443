import RAPIER from "@dimforge/rapier2d-deterministic-compat";
import DepthUtils from "../../../utils/depth";
import { defaultRandom } from "../../../utils/random";
import { FrameTimer } from "../../managers/combat/TickerManager";
import type { Game } from "../../scenes/Game";
import { CollisionContext } from "../../types";
import { IMonsterAnimController } from "../monster/anims/IMonsterAnimController";
import { MonsterModel } from "../MonsterModel";
import { PositionManager } from "../../managers/view/PositionManager";
import { CombatEntity } from "../core/CombatEntity";
import { Faction } from "../Enum";
import CombatManager from "../../managers/CombatManager";
import GridManager from "../../managers/combat/GridManager";
import PlantHelper from "../../utils/helper/PlantHelper";
import { PlantEntity } from "./PlantEntity";
import { BaseEntity } from "../core/BaseEntity";
import { createZombieAnimController, LegacyMonsterAnimController } from "../monster/anims/LegacyMonsterAnimControllers";

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
  private destroyListeners: Array<(entity: MonsterEntity) => void> = [];

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

    this.playSpawnAudio();
    this.startMove();
    this.model.onCreate(this);
  }

  public addDestroyListener(listener: (entity: MonsterEntity) => void) {
    this.destroyListeners.push(listener);
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
    const listeners = [...this.destroyListeners];
    this.destroyListeners.length = 0;
    listeners.forEach((listener) => listener(this));
    this.animController.destroy();
    this.attachSprites.forEach((sprite) => sprite.destroy());
    super.destroy();
  }
}


export type MonsterRank = "normal" | "elite" | "boss";

export type MonsterDefinition = {
  mid: number;
  nameKey: string;
  texturePath?: string;
  level: number;
  weight: (waveID: number) => number;
  leastWaveID?: number;
  leastWaveIDByStageID?: (stageID: number) => number;
  rank?: MonsterRank;
  maxHealth: number;
  baseSpeed: number;
  attackDamage: number;
  attackInterval?: number;
  isDefaultFlying?: boolean;
  isDefaultInVoid?: boolean;
  couldCarryStarShards?: boolean;
  createEntity: (scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) => MonsterEntity;
};

export class PresetMonsterModel extends MonsterModel {
  public readonly mid: number;
  public readonly nameKey: string;
  public readonly texturePath: string;
  public readonly level: number;
  public readonly weight: (waveID: number) => number;
  public readonly leastWaveID?: number;
  public readonly leastWaveIDByStageID?: (stageID: number) => number;
  public readonly rank: MonsterRank;
  public readonly maxHealth: number;
  public readonly baseSpeed: number;
  public readonly attackDamage: number;
  public readonly attackInterval: number;
  public readonly isDefaultFlying: boolean;
  public readonly isDefaultInVoid: boolean;
  public readonly couldCarryStarShards: boolean;

  private readonly entityFactory: MonsterDefinition["createEntity"];

  public constructor(def: MonsterDefinition) {
    super();
    this.mid = def.mid;
    this.nameKey = def.nameKey;
    this.texturePath = def.texturePath ?? "zombie/zombie";
    this.level = def.level;
    this.weight = def.weight;
    this.leastWaveID = def.leastWaveID;
    this.leastWaveIDByStageID = def.leastWaveIDByStageID;
    this.rank = def.rank ?? "normal";
    this.maxHealth = def.maxHealth;
    this.baseSpeed = def.baseSpeed;
    this.attackDamage = def.attackDamage;
    this.attackInterval = def.attackInterval ?? 1000;
    this.isDefaultFlying = def.isDefaultFlying ?? false;
    this.isDefaultInVoid = def.isDefaultInVoid ?? false;
    this.couldCarryStarShards = def.couldCarryStarShards ?? true;
    this.entityFactory = def.createEntity;
  }

  public getWeight(waveID: number): number {
    return this.weight(waveID);
  }

  public createEntity(scene: Game, col: number, row: number, waveID: number): MonsterEntity {
    return this.entityFactory(scene, col, row, this, waveID);
  }
}

export abstract class BaseMonsterEntity extends MonsterEntity {
  declare public model: PresetMonsterModel;

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    this.ExtraData.waveId = waveID;
    this.currentHealth = model.maxHealth;
    this.health = model.maxHealth;
  }

  protected abstract createAnimController(): IMonsterAnimController;

  protected buildView(): void {
    if (this.animController) return;
    this.animController = this.createAnimController();
    this.animController.setDepth(this.baseDepth);
    this.animController.updatePosition(this.x + this.offsetX, this.y + this.offsetY);
  }

  public getLegacyController() {
    return this.animController as LegacyMonsterAnimController<any> | undefined;
  }

  protected getAnimTargets() {
    return this.getLegacyController()?.getTargets() ?? [];
  }

  protected syncHealth() {
    this.health = this.currentHealth;
  }

  protected rawDamage(amount: number) {
    this.currentHealth -= amount;
    this.syncHealth();
    this.animController.highlight();

    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.syncHealth();
      this.ZombieDie();
      return;
    }

    if (amount > 10) {
      this.scene.musical.generalHitAudio.play("generalHit");
    }
  }

  public override takeDamage(amount: number, _dealer?: BaseEntity, _source?: BaseEntity): void {
    if (this.currentHealth <= 0 || this.isDying) return;
    this.rawDamage(amount);
  }

  protected onHurt(_amount: number, _realDamage: number, _dealer?: BaseEntity, _source?: BaseEntity): void { }

  protected onDeath(): void {
    this.ZombieDie();
  }

  protected override playDeathAnimation(): void {
    this.isDying = true;
    this.stopMove();

    if (this.rigidBody) {
      this.scene.rapierWorld.removeRigidBody(this.rigidBody);
      this.rigidBody = null;
    }

    this.scene.tweens.add({
      targets: [...this.getAnimTargets(), ...this.attachSprites.values()],
      angle: 90,
      duration: 400,
      ease: "Linear",
      onComplete: () => {
        this.scene.musical.zombieDeathPool.play();
        const smoke = this.scene.add.sprite(this.x, this.y, "anime/death_smoke")
          .setDisplaySize(100, 100)
          .setOrigin(0.5, 1)
          .setDepth(this.baseDepth + 15);
        smoke.play("death_smoke");
        smoke.once("animationcomplete", () => smoke.destroy());
      },
    });
  }
}

export abstract class StagedBodyMonsterEntity extends BaseMonsterEntity {
  // 破损程度分界点
  protected damageThresholds: number[] = [];
  private currentStage = -1;

  protected updateBodyDamageStage() {
    const raw = this.getLegacyController()?.raw as { switchBodyFrame?: (value: boolean | number) => void } | undefined;
    const fn = raw?.switchBodyFrame?.bind(raw);
    if (!fn || this.damageThresholds.length === 0) return;

    let stage = -1;
    for (let i = 0; i < this.damageThresholds.length; i++) {
      if (this.currentHealth <= this.damageThresholds[i]) {
        stage = i;
      }
    }
    if (stage === this.currentStage) return;
    this.currentStage = stage;

    if (this.damageThresholds.length === 1) {
      fn(stage >= 0);
      return;
    }

    fn(stage < 0 ? 0 : Math.min(stage + 1, this.damageThresholds.length));
  }

  public override takeDamage(amount: number, dealer?: BaseEntity, source?: BaseEntity): void {
    super.takeDamage(amount, dealer, source);
    this.updateBodyDamageStage();
  }
}

export type ArmorConfig = {
  key: string;
  maxHealth: number;
  thresholds: number[];
  damageScale?: number;
  hitSound?: "ironHit" | "leatherHit";
  scale?: number;
  originX?: number;
  originY?: number;
  x?: number;
  y?: number;
  depth?: number;
};

export abstract class ArmorMonsterEntity extends StagedBodyMonsterEntity {
  protected armorHealth = 0;
  protected armorBroken = false;
  protected armorKey = "";
  protected armorConfig!: ArmorConfig;

  protected createArmor(config: ArmorConfig) {
    this.armorConfig = config;
    this.armorHealth = config.maxHealth;
    this.armorBroken = false;
    this.armorKey = config.key;

    const sprite = this.scene.add.sprite(
      this.x + this.offsetX + (config.x ?? 0),
      this.y + this.offsetY + (config.y ?? -PositionManager.Instance.GRID_SIZEY * 1.15),
      config.key,
    );
    sprite.setScale((config.scale ?? 1.4) * PositionManager.Instance.scaleFactor);
    sprite.setOrigin(config.originX ?? 0.5, config.originY ?? 0.5);
    sprite.setFrame(0).setDepth(this.baseDepth + (config.depth ?? 13));
    this.attachSprites.set(config.key, sprite);
  }

  protected updateArmorFrame() {
    if (this.armorBroken) return;
    const sprite = this.attachSprites.get(this.armorKey);
    if (!sprite) return;

    let frame = this.armorConfig.thresholds.length;
    for (let i = 0; i < this.armorConfig.thresholds.length; i++) {
      if (this.armorHealth > this.armorConfig.thresholds[i]) {
        frame = i;
        break;
      }
    }
    sprite.setFrame(frame);
  }

  protected onArmorBroken(_overflowDamage: number): void { }

  public override takeDamage(amount: number, dealer?: BaseEntity, source?: BaseEntity): void {
    if (this.currentHealth <= 0 || this.isDying) return;

    if (!this.armorBroken && this.armorHealth > 0) {
      const real = amount * (this.armorConfig.damageScale ?? 1);
      if (this.armorHealth > real) {
        this.armorHealth -= real;
        this.animController.highlight();
        if (this.armorConfig.hitSound) {
          this.scene.musical.shieldHitAudio.play(this.armorConfig.hitSound);
        }
        this.updateArmorFrame();
        return;
      }

      const overflow = Math.max(0, real - this.armorHealth);
      this.armorHealth = 0;
      this.armorBroken = true;
      this.attachSprites.get(this.armorKey)?.setVisible(false);
      this.onArmorBroken(overflow);
      if (overflow <= 0) return;
      super.takeDamage(overflow, dealer, source);
      return;
    }

    super.takeDamage(amount, dealer, source);
  }
}

export function addHandAttachment(entity: BaseMonsterEntity, key: string, scale = 1.4, depth = 13) {
  const sprite = entity.scene.add.sprite(
    entity.x + entity.offsetX - PositionManager.Instance.GRID_SIZEX * 0.42,
    entity.y - PositionManager.Instance.GRID_SIZEY * 0.7 + entity.offsetY,
    key,
  );
  sprite.setScale(scale * PositionManager.Instance.scaleFactor).setOrigin(0.5, 1).setDepth(entity.baseDepth + depth);
  entity.attachSprites.set(key, sprite);
  return sprite;
}


export class BaseZombieEntity extends StagedBodyMonsterEntity {
  protected damageThresholds = [150];

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
  }

  protected createAnimController() {
    return createZombieAnimController("zombie", this.scene, this.x, this.y);
  }
}

export class BaseSkeletonEntity extends StagedBodyMonsterEntity {
  protected damageThresholds = [100];

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
  }

  protected createAnimController() {
    return createZombieAnimController("skeleton", this.scene, this.x, this.y);
  }
}

export class BaseVindicatorEntity extends StagedBodyMonsterEntity {
  protected damageThresholds = [180];
  protected attackTween: Phaser.Tweens.Tween | null = null;
  protected weaponKey = "attach/hd_axe";

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    addHandAttachment(this, this.weaponKey);
  }

  protected createAnimController() {
    return createZombieAnimController("vindicator", this.scene, this.x, this.y);
  }

  public override startAttacking(target: any) {
    if (!this.attackTween) {
      const sprite = this.attachSprites.get(this.weaponKey);
      if (sprite) {
        this.attackTween = this.scene.tweens.add({
          targets: sprite,
          angle: -15,
          duration: 200,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }
    super.startAttacking(target);
  }

  public override stopAttacking() {
    this.attackTween?.stop();
    this.attackTween = null;
    this.attachSprites.get(this.weaponKey)?.setAngle(0);
    super.stopAttacking();
  }
}

export class ShieldVindicatorEntity extends BaseVindicatorEntity {
  private shieldHealth = 1000;

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    const shield = this.scene.add.sprite(
      this.x + this.offsetX - PositionManager.Instance.GRID_SIZEX * 0.42,
      this.y - PositionManager.Instance.GRID_SIZEY * 0.7 + this.offsetY,
      "attach/hd_shield",
    );
    shield.setScale(PositionManager.Instance.scaleFactor * 2.2).setOrigin(0.5, 0.35).setFrame(0).setDepth(this.baseDepth + 14);
    this.attachSprites.set("shield", shield);
  }

  public override takeDamage(amount: number, dealer?: BaseEntity, source?: BaseEntity): void {
    if (this.shieldHealth > 0) {
      const blocked = amount * 0.5;
      if (this.shieldHealth > blocked) {
        this.shieldHealth -= blocked;
        this.attachSprites.get("shield")?.setFrame(this.shieldHealth > 500 ? 0 : 1);
        this.scene.musical.shieldHitAudio.play("ironHit");
        this.animController.highlight();
        return;
      }
      this.shieldHealth = 0;
      this.attachSprites.get("shield")?.setVisible(false);
    }
    super.takeDamage(amount, dealer, source);
  }
}

export class BaseZombieArmorEntity extends ArmorMonsterEntity {
  protected damageThresholds = [150];

  protected createAnimController() {
    return createZombieAnimController("zombie", this.scene, this.x, this.y);
  }
}
