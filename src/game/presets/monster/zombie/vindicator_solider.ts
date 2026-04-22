import { PresetMonsterModel, ShieldVindicatorEntity } from "../../../models/entities/MonsterEntity";
import { MonsterSpeed, ZombieAttackInterval } from "../../../../constants/game";


export const VindicatorSoliderData = new PresetMonsterModel({
  mid: 11,
  nameKey: "VindicatorSolider",
  level: 4,
  weight: () => 3500,
  leastWaveID: 14,
  maxHealth: 360,
  baseSpeed: MonsterSpeed.VindicatorSolider,
  attackDamage: 32,
  attackInterval: ZombieAttackInterval.VindicatorSolider,
  createEntity: (scene, col, row, model, waveID) => new ShieldVindicatorEntity(scene, col, row, model, waveID),
});
