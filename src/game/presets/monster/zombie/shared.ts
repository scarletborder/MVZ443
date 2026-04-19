import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import MobCmd from "../../../utils/cmd/MobCmd";
import { ArrowData } from "../../bullet/arrow";
import { PositionManager } from "../../../managers/view/PositionManager";
import { createZombieAnimController } from "../../../models/monster/anims/LegacyMonsterAnimControllers";
import { BaseEntity } from "../../../models/core/BaseEntity";
import { Faction } from "../../../models/Enum";
import { Game } from "../../../scenes/Game";
import { addHandAttachment, ArmorMonsterEntity, PresetMonsterModel, StagedBodyMonsterEntity } from "../common";
import { VindicatorData } from "./vindicator";

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

export class BaseSkeletonBowEntity extends BaseSkeletonEntity {
  protected arrowDamage = 70;
  protected arrowInterval = 3500;

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    addHandAttachment(this, "attach/hd_bow");
    this.tickmanager.addEvent({
      delay: this.arrowInterval,
      repeat: -1,
      callback: () => {
        if (this.isFrozen || this.attacking || this.currentHealth <= 0) return;
        this.stopMove();
        ProjectileCmd.Create(ArrowData, this.scene, this.x, this.row, {
          damage: this.arrowDamage,
          faction: Faction.ZOMBIE,
          speed: 320,
        });
        this.scene.time.delayedCall(350, () => {
          if (this.currentHealth > 0 && !this.attacking) {
            this.startMove();
          }
        });
      }
    });
  }
}

export class EvokerEntity extends BaseZombieEntity {
  protected damageThresholds = [160];

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    this.tickmanager.addEvent({
      startAt: 24000,
      delay: 28000,
      repeat: 3,
      callback: () => this.summonVindicator(),
    });
  }

  protected override createAnimController() {
    return createZombieAnimController("evoker", this.scene, this.x, this.y);
  }

  private summonVindicator() {
    if (this.isFrozen || this.currentHealth <= 0) return;

    this.stopAttacking();
    this.stopMove();
    this.animController.stopLegSwing();
    this.animController.startArmSwing();

    const entries = [
      [this.col + 1, this.row],
      [Math.max(0, this.col - 1), this.row],
      [this.col, this.row - 1],
      [this.col, this.row + 1],
    ];

    for (const [col, row] of entries) {
      MobCmd.Spawn(VindicatorData.mid, this.scene, col, row, -10);
    }

    this.scene.time.delayedCall(3000, () => {
      if (this.currentHealth > 0 && !this.isFrozen) {
        this.animController.stopArmSwing();
        this.startMove();
      }
    });
  }
}
