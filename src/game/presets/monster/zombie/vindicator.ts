import { BaseVindicatorEntity, PresetMonsterModel } from "../../../models/entities/MonsterEntity";
import { MonsterSpeed, ZombieAttackInterval } from "../../../../constants/game";


export class VindicatorEntity extends BaseVindicatorEntity { }

export const VindicatorData = new PresetMonsterModel({
  mid: 10,
  nameKey: "Vindicator",
  level: 9999,
  weight: () => 0,
  leastWaveID: 9999,
  maxHealth: 360,
  baseSpeed: MonsterSpeed.Vindicator,
  attackDamage: 32,
  attackInterval: ZombieAttackInterval.Vindicator,
  createEntity: (scene, col, row, model, waveID) => new VindicatorEntity(scene, col, row, model, waveID),
});
