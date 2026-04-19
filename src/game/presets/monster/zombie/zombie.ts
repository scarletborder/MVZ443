import { Game } from "../../../scenes/Game";
import { PresetMonsterModel } from "../common";
import { BaseZombieEntity } from "./shared";

export class ZombieEntity extends BaseZombieEntity {
  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
  }
}

export const ZombieData = new PresetMonsterModel({
  mid: 1,
  nameKey: "Zombie",
  level: 1,
  weight: (waveID) => Math.max(400, 4000 - (waveID - 4) * 180),
  leastWaveID: 0,
  maxHealth: 300,
  baseSpeed: 20,
  attackDamage: 20,
  createEntity: (scene, col, row, model, waveID) => new ZombieEntity(scene, col, row, model, waveID),
});
