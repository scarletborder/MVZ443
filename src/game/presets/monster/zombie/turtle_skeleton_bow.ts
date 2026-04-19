import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import { ArrowData } from "../../bullet/arrow";
import { PositionManager } from "../../../managers/view/PositionManager";
import { Faction } from "../../../models/Enum";
import { Game } from "../../../scenes/Game";
import { PresetMonsterModel } from "../common";
import { BaseSkeletonBowEntity } from "./shared";

export class TurtleSkeletonBowEntity extends BaseSkeletonBowEntity {
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

  public override takeDamage(amount: number, dealer?: any, source?: any): void {
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
