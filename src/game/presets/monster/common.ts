import { PositionManager } from "../../managers/view/PositionManager";
import { BaseEntity } from "../../models/core/BaseEntity";
import { MonsterEntity } from "../../models/entities/MonsterEntity";
import { IMonsterAnimController } from "../../models/monster/anims/IMonsterAnimController";
import { LegacyMonsterAnimController } from "../../models/monster/anims/LegacyMonsterAnimControllers";
import { MonsterModel } from "../../models/MonsterModel";
import { Game } from "../../scenes/Game";

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
