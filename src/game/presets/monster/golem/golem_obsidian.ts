import { PositionManager } from "../../../managers/view/PositionManager";
import { ObsidianGolemAnimProps } from "../../../sprite/normal_golem";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import MobCmd from "../../../utils/cmd/MobCmd";
import { Faction } from "../../../models/Enum";
import { PresetMonsterModel } from "../common";
import { BaseGolemEntity, createObsidianColumnBurst } from "./shared";

export class ObsidianGolemEntity extends BaseGolemEntity {
  public constructor(scene: Phaser.Scene & any, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID, 7);
  }

  protected createProps() {
    return ObsidianGolemAnimProps;
  }

  protected getCallBase() {
    return 38;
  }

  protected getCastDelay() {
    return 7000;
  }

  protected getRecoverDelay() {
    return 2000;
  }

  protected skill1(): void {
    createObsidianColumnBurst(this, [7, 5, 3]);
  }

  protected skill2(): void {
    const rows = [this.row, Math.max(0, this.row - 1), Math.min(PositionManager.Instance.Row_Number - 1, this.row + 1)];
    for (const row of rows) {
      const x = PositionManager.Instance.getPlantBottomCenter(6, row).x;
      ProjectileCmd.CreateExplosion(this.scene, x, row, {
        damage: 500,
        leftGrid: 0.8,
        rightGrid: 0.8,
        upGrid: 0.8,
        faction: Faction.ZOMBIE,
      });
      MobCmd.Spawn(11, this.scene, 7, row, -10);
    }
  }

  protected reposition(done: () => void): void {
    this.getLegacyController()?.raw.highJump?.(120 * PositionManager.Instance.scaleFactor);
    this.tickmanager.delayedCall({
      delay: 1200,
      callback: () => {
        const newRow = Phaser.Math.Between(0, PositionManager.Instance.Row_Number - 1);
        const pos = PositionManager.Instance.getZombieBottomCenter(8, newRow);
        this.col = 8;
        this.row = newRow;
        this.rigidBody?.setTranslation(pos, true);
        this.animController.updatePosition(pos.x + this.offsetX, pos.y + this.offsetY);
        this.getLegacyController()?.raw.land?.();
        done();
      }
    });
  }
}

export const ObsidianGolemData = new PresetMonsterModel({
  mid: 12,
  nameKey: "ObsidianGolem",
  level: 999,
  weight: () => 0,
  leastWaveID: 0,
  rank: "elite",
  maxHealth: 12000,
  baseSpeed: 25,
  attackDamage: 50,
  attackInterval: 1200,
  createEntity: (scene, col, row, model, waveID) => new ObsidianGolemEntity(scene, col, row, model, waveID),
});
