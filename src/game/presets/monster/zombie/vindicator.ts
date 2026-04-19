import { PresetMonsterModel } from "../common";
import { BaseVindicatorEntity } from "./shared";

export class VindicatorEntity extends BaseVindicatorEntity { }

export const VindicatorData = new PresetMonsterModel({
  mid: 10,
  nameKey: "Vindicator",
  level: 9999,
  weight: () => 0,
  leastWaveID: 9999,
  maxHealth: 360,
  baseSpeed: 30,
  attackDamage: 32,
  createEntity: (scene, col, row, model, waveID) => new VindicatorEntity(scene, col, row, model, waveID),
});
