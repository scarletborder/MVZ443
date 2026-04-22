import { BaseZombieArmorEntity, PresetMonsterModel } from "../../../models/entities/MonsterEntity";
import type { Game } from "../../../scenes/Game";
import { MonsterSpeed, ZombieAttackInterval } from "../../../../constants/game";

export class CapZombieEntity extends BaseZombieArmorEntity {
  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    this.createArmor({
      key: "attach/cap",
      maxHealth: 370,
      thresholds: [250, 125],
      hitSound: "leatherHit",
    });
  }
}

export const CapZombieData = new PresetMonsterModel({
  mid: 2,
  nameKey: "CapZombie",
  level: 2,
  weight: (waveID) => Math.max(800, 4000 - (waveID - 4) * 150),
  leastWaveID: 0,
  maxHealth: 300,
  baseSpeed: MonsterSpeed.CapZombie,
  attackDamage: 20,
  attackInterval: ZombieAttackInterval.CapZombie,
  createEntity: (scene, col, row, model, waveID) => new CapZombieEntity(scene, col, row, model, waveID),
});
