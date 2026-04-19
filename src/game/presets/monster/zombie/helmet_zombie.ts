import { Game } from "../../../scenes/Game";
import { PresetMonsterModel } from "../common";
import { BaseZombieArmorEntity } from "./shared";

export class HelmetZombieEntity extends BaseZombieArmorEntity {
  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    this.createArmor({
      key: "attach/helmet",
      maxHealth: 1100,
      thresholds: [1100 * 2 / 3, 1100 / 3],
      hitSound: "ironHit",
    });
  }
}

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
