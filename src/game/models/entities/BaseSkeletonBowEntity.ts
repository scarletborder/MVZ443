import { ProjectileCmd } from "../../utils/cmd/ProjectileCmd";
import { ArrowData } from "../../presets/bullet/arrow";
import { Faction } from "../Enum";
import type { Game } from "../../scenes/Game";
import { addHandAttachment, BaseSkeletonEntity, PresetMonsterModel } from "./MonsterEntity";

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
        if (this.currentHealth <= 0 || !this.scene) return;
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
