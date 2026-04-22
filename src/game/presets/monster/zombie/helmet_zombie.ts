import { BaseZombieArmorEntity, PresetMonsterModel } from "../../../models/entities/MonsterEntity";
import type { Game } from "../../../scenes/Game";
import { MonsterSpeed, ZombieAttackInterval } from "../../../../constants/game";

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
  baseSpeed: MonsterSpeed.HelmetZombie,
  attackDamage: 20,
  attackInterval: ZombieAttackInterval.HelmetZombie,
  createEntity: (scene, col, row, model, waveID) => new HelmetZombieEntity(scene, col, row, model, waveID),
});
