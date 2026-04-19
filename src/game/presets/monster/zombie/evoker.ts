import { PresetMonsterModel } from "../common";
import { EvokerEntity } from "./shared";

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
