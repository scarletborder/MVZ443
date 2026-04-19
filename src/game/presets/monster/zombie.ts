import { ProjectileCmd } from "../../utils/cmd/ProjectileCmd";
import { ArrowData } from "../bullet/arrow";
import { PositionManager } from "../../managers/view/PositionManager";
import { createZombieAnimController } from "../../models/monster/anims/LegacyMonsterAnimControllers";
import { BaseEntity } from "../../models/core/BaseEntity";
import { Faction } from "../../models/Enum";
import { Game } from "../../scenes/Game";
import { addHandAttachment, ArmorMonsterEntity, PresetMonsterModel, StagedBodyMonsterEntity } from "./common";
import MobCmd from "../../utils/cmd/MobCmd";
import { MonsterEntity } from "../../models/entities/MonsterEntity";

class ZombieEntity extends StagedBodyMonsterEntity {
  protected damageThresholds = [150];

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
  }

  protected createAnimController() {
    return createZombieAnimController("zombie", this.scene, this.x, this.y);
  }
}

class SkeletonEntity extends StagedBodyMonsterEntity {
  protected damageThresholds = [100];

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
  }

  protected createAnimController() {
    return createZombieAnimController("skeleton", this.scene, this.x, this.y);
  }

  public override takeDamage(amount: number, dealer?: BaseEntity, source?: BaseEntity): void {
    super.takeDamage(amount, dealer, source);
    if (amount > 0 && this.currentHealth > 0) {
      this.scene.musical.skeletonSpawnAudio.play("skeletonSpawn");
    }
  }
}

class EvokerEntity extends StagedBodyMonsterEntity {
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

  protected createAnimController() {
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
      MobCmd.Spawn(10, this.scene, col, row, -10, (summoned: MonsterEntity) => {
        summoned.stopMove();
        summoned.tickmanager.delayedCall({
          delay: 2000,
          callback: () => {
            if (summoned && summoned.currentHealth > 0 && !summoned.isFrozen) {
              summoned.startMove();
            }
          }
        });
      });
    }

    this.scene.time.delayedCall(3000, () => {
      if (this.currentHealth > 0 && !this.isFrozen) {
        this.animController.stopArmSwing();
        this.startMove();
      }
    });
  }
}

class VindicatorEntity extends StagedBodyMonsterEntity {
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

class ShieldVindicatorEntity extends VindicatorEntity {
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

class CapZombieEntity extends ArmorMonsterEntity {
  protected damageThresholds = [150];

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    this.createArmor({
      key: "attach/cap",
      maxHealth: 370,
      thresholds: [250, 125],
      hitSound: "leatherHit",
    });
  }

  protected createAnimController() {
    return createZombieAnimController("zombie", this.scene, this.x, this.y);
  }
}

class HelmetZombieEntity extends ArmorMonsterEntity {
  protected damageThresholds = [150];

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    this.createArmor({
      key: "attach/helmet",
      maxHealth: 1100,
      thresholds: [1100 * 2 / 3, 1100 / 3],
      hitSound: "ironHit",
    });
  }

  protected createAnimController() {
    return createZombieAnimController("zombie", this.scene, this.x, this.y);
  }
}

class MinerZombieEntity extends ZombieEntity {
  private swingTween: Phaser.Tweens.Tween | null = null;

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    addHandAttachment(this, "attach/hd_pickaxe");
  }

  public override startAttacking(target: any) {
    if (!this.swingTween) {
      const sprite = this.attachSprites.get("attach/hd_pickaxe");
      if (sprite) {
        this.swingTween = this.scene.tweens.add({
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
    this.swingTween?.stop();
    this.swingTween = null;
    this.attachSprites.get("attach/hd_pickaxe")?.setAngle(0);
    super.stopAttacking();
  }
}

class MinerHelmetZombieEntity extends HelmetZombieEntity {
  private swingTween: Phaser.Tweens.Tween | null = null;

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    addHandAttachment(this, "attach/hd_pickaxe");
  }

  public override startAttacking(target: any) {
    if (!this.swingTween) {
      const sprite = this.attachSprites.get("attach/hd_pickaxe");
      if (sprite) {
        this.swingTween = this.scene.tweens.add({
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
    this.swingTween?.stop();
    this.swingTween = null;
    this.attachSprites.get("attach/hd_pickaxe")?.setAngle(0);
    super.stopAttacking();
  }
}

class StickZombieEntity extends ZombieEntity {
  private hasStick = true;
  private vaultTargetX = 0;

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    addHandAttachment(this, "attach/hd_stick");
    this.tickmanager.addEvent({
      delay: 100,
      repeat: -1,
      callback: () => {
        if (!this.isFlying || this.x > this.vaultTargetX) return;
        this.isFlying = false;
        this.speed = this.originalSpeed * 0.5;
        this.attachSprites.get("attach/hd_stick")?.setVisible(false);
        this.startMove();
      },
    });
  }

  public override startAttacking(target: any) {
    if (this.hasStick && target && typeof target.col === "number") {
      this.hasStick = false;
      this.isFlying = true;
      this.vaultTargetX = PositionManager.Instance.getGridTopLeft(target.col, this.row).x - PositionManager.Instance.GRID_SIZEX * 0.25;
      this.setVelocityX(-this.originalSpeed * 2.2);
      return;
    }
    if (this.isFlying) return;
    super.startAttacking(target);
  }

  public override updateView(vec: { x: number; y: number; }): void {
    super.updateView(vec);
    if (this.isFlying) {
      this.animController.updatePosition(this.x + this.offsetX, this.y + this.offsetY - PositionManager.Instance.GRID_SIZEY * 0.4);
    }
  }
}

class TurtleZombieEntity extends ArmorMonsterEntity {
  protected damageThresholds = [150];
  private buffApplied = false;

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    this.createArmor({
      key: "attach/turtle",
      maxHealth: 370,
      thresholds: [250, 125],
      damageScale: 0.5,
      hitSound: "leatherHit",
    });
  }

  protected createAnimController() {
    return createZombieAnimController("zombie", this.scene, this.x, this.y);
  }

  protected override onArmorBroken(): void {
    if (this.buffApplied) return;
    this.buffApplied = true;
    this.speed = this.originalSpeed * 2;
    if (!this.attacking && !this.isFrozen) {
      this.startMove();
    }
  }
}

class SkeletonBowEntity extends SkeletonEntity {
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

class TurtleSkeletonBowEntity extends SkeletonBowEntity {
  private shellHealth = 375;
  private broken = false;

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    const shell = this.scene.add.sprite(
      this.x + this.offsetX,
      this.y - PositionManager.Instance.GRID_SIZEY * 1.15 + this.offsetY,
      "attach/turtle",
    );
    shell.setScale(PositionManager.Instance.scaleFactor * 1.4).setFrame(0).setDepth(this.baseDepth + 13);
    this.attachSprites.set("turtle_shell", shell);
    this.arrowDamage = 50;
    this.arrowInterval = 2000;
  }

  public override takeDamage(amount: number, dealer?: BaseEntity, source?: BaseEntity): void {
    if (!this.broken && this.shellHealth > 0) {
      const real = amount * 0.5;
      if (this.shellHealth > real) {
        this.shellHealth -= real;
        this.attachSprites.get("turtle_shell")?.setFrame(this.shellHealth > 250 ? 0 : this.shellHealth > 125 ? 1 : 2);
        this.scene.musical.shieldHitAudio.play("leatherHit");
        this.animController.highlight();
        return;
      }

      this.broken = true;
      this.shellHealth = 0;
      this.attachSprites.get("turtle_shell")?.setVisible(false);
      this.speed = this.originalSpeed * 2;
      this.arrowDamage = 90;

      for (let i = 0; i < 5; i++) {
        this.scene.time.delayedCall(600 * i, () => {
          if (this.currentHealth > 0) {
            ProjectileCmd.Create(ArrowData, this.scene, this.x, this.row, {
              damage: this.arrowDamage,
              faction: Faction.ZOMBIE,
              speed: 320,
            });
          }
        });
      }
    }

    super.takeDamage(amount, dealer, source);
  }
}

export const ZombieData = new PresetMonsterModel({
  mid: 1,
  nameKey: "Zombie",
  level: 1,
  weight: (waveID) => Math.max(400, 4000 - (waveID - 4) * 180),
  leastWaveID: 0,
  maxHealth: 300,
  baseSpeed: 20,
  attackDamage: 20,
  createEntity: (scene, col, row, model, waveID) => new ZombieEntity(scene, col, row, model, waveID),
});

export const CapZombieData = new PresetMonsterModel({
  mid: 2,
  nameKey: "CapZombie",
  level: 2,
  weight: (waveID) => Math.max(800, 4000 - (waveID - 4) * 150),
  leastWaveID: 0,
  maxHealth: 300,
  baseSpeed: 20,
  attackDamage: 20,
  createEntity: (scene, col, row, model, waveID) => new CapZombieEntity(scene, col, row, model, waveID),
});

export const HelmetZombieData = new PresetMonsterModel({
  mid: 3,
  nameKey: "HelmetZombie",
  level: 4,
  weight: () => 3000,
  leastWaveID: 1,
  maxHealth: 300,
  baseSpeed: 20,
  attackDamage: 20,
  createEntity: (scene, col, row, model, waveID) => new HelmetZombieEntity(scene, col, row, model, waveID),
});

export const MinerZombieData = new PresetMonsterModel({
  mid: 4,
  nameKey: "MinerZombie",
  level: 2,
  weight: () => 2500,
  leastWaveID: 2,
  maxHealth: 300,
  baseSpeed: 20,
  attackDamage: 60,
  createEntity: (scene, col, row, model, waveID) => new MinerZombieEntity(scene, col, row, model, waveID),
});

export const MinerHelmetZombieData = new PresetMonsterModel({
  mid: 5,
  nameKey: "MinerHelmetZombie",
  level: 5,
  weight: () => 2000,
  leastWaveID: 13,
  maxHealth: 300,
  baseSpeed: 20,
  attackDamage: 60,
  createEntity: (scene, col, row, model, waveID) => new MinerHelmetZombieEntity(scene, col, row, model, waveID),
});

export const SkeletonData = new PresetMonsterModel({
  mid: 6,
  nameKey: "Skeleton",
  level: 999,
  weight: () => 0,
  leastWaveID: 9999,
  maxHealth: 250,
  baseSpeed: 20,
  attackDamage: 20,
  createEntity: (scene, col, row, model, waveID) => new SkeletonEntity(scene, col, row, model, waveID),
});

export const SkeletonBowData = new PresetMonsterModel({
  mid: 7,
  nameKey: "SkeletonBow",
  level: 2,
  weight: (waveID) => Math.max(800, 1500 - (waveID - 15) * 100),
  leastWaveID: 7,
  maxHealth: 250,
  baseSpeed: 20,
  attackDamage: 25,
  createEntity: (scene, col, row, model, waveID) => new SkeletonBowEntity(scene, col, row, model, waveID),
});

export const StickZombieData = new PresetMonsterModel({
  mid: 8,
  nameKey: "StickZombie",
  level: 2,
  weight: () => 2000,
  leastWaveID: 9,
  maxHealth: 300,
  baseSpeed: 40,
  attackDamage: 30,
  createEntity: (scene, col, row, model, waveID) => new StickZombieEntity(scene, col, row, model, waveID),
});

export const EvokerData = new PresetMonsterModel({
  mid: 9,
  nameKey: "Evoker",
  level: 5,
  weight: () => 1000,
  leastWaveID: 10,
  maxHealth: 400,
  baseSpeed: 25,
  attackDamage: 20,
  createEntity: (scene, col, row, model, waveID) => new EvokerEntity(scene, col, row, model, waveID),
});

export const VindicatorData = new PresetMonsterModel({
  mid: 10,
  nameKey: "Vindicator",
  level: 9999,
  weight: () => 0,
  leastWaveID: 9999,
  maxHealth: 360,
  baseSpeed: 30,
  attackDamage: 32,
  createEntity: (scene, col, row, model, waveID) => new VindicatorEntity(scene, col, row, model, waveID),
});

export const VindicatorSoliderData = new PresetMonsterModel({
  mid: 11,
  nameKey: "VindicatorSolider",
  level: 4,
  weight: () => 3500,
  leastWaveID: 14,
  maxHealth: 360,
  baseSpeed: 15,
  attackDamage: 32,
  createEntity: (scene, col, row, model, waveID) => new ShieldVindicatorEntity(scene, col, row, model, waveID),
});

export const TurtleZombieData = new PresetMonsterModel({
  mid: 14,
  nameKey: "TurtleZombie",
  level: 2,
  weight: () => 1200,
  leastWaveID: 4,
  maxHealth: 300,
  baseSpeed: 18,
  attackDamage: 20,
  createEntity: (scene, col, row, model, waveID) => new TurtleZombieEntity(scene, col, row, model, waveID),
});

export const TurtleSkeletonBowData = new PresetMonsterModel({
  mid: 16,
  nameKey: "TurtleSkeletonBow",
  level: 3,
  weight: (waveID) => Math.min(1800, 1000 + Math.max(waveID - 15, 0) * 40),
  leastWaveID: 10,
  leastWaveIDByStageID: (stageID) => stageID >= 6 ? 6 : 10,
  maxHealth: 250,
  baseSpeed: 20,
  attackDamage: 40,
  createEntity: (scene, col, row, model, waveID) => new TurtleSkeletonBowEntity(scene, col, row, model, waveID),
});
