import { PresetMonsterModel, ShieldVindicatorEntity } from "../../../models/entities/MonsterEntity";


export const VindicatorSoliderData = new PresetMonsterModel({
  mid: 11,
  nameKey: "VindicatorSolider",
  level: 4,
  weight: () => 3500,
  leastWaveID: 14,
  maxHealth: 360,
  baseSpeed: 15,
  attackDamage: 32,
  createEntity: (scene, col, row, model, waveID) => new ShieldVindicatorEntity(scene, col, row, model, waveID),
});
