import { Game } from "../../../scenes/Game";
import { addHandAttachment, PresetMonsterModel } from "../common";
import { HelmetZombieEntity } from "./helmet_zombie";

export class MinerHelmetZombieEntity extends HelmetZombieEntity {
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
