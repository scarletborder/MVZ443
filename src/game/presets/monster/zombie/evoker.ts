import { PresetMonsterModel, BaseZombieEntity } from "../../../models/entities/MonsterEntity";
import { createZombieAnimController } from "../../../models/monster/anims/LegacyMonsterAnimControllers";
import type { Game } from "../../../scenes/Game";
import MobCmd from "../../../utils/cmd/MobCmd";
import { VindicatorData } from "./vindicator";

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
