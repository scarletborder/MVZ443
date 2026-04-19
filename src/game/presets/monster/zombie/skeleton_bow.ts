import { Game } from "../../../scenes/Game";
import { PresetMonsterModel } from "../common";
import { BaseSkeletonBowEntity } from "./shared";

export class SkeletonBowEntity extends BaseSkeletonBowEntity {
  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
  }
}

export const SkeletonBowData = new PresetMonsterModel({
  mid: 7,
  nameKey: "SkeletonBow",
  level: 2,
  weight: (waveID) => Math.max(800, 1500 - (waveID - 15) * 100),
  leastWaveID: 7,
  maxHealth: 250,
  baseSpeed: 20,
  attackDamage: 25,
  createEntity: (scene, col, row, model, waveID) => new SkeletonBowEntity(scene, col, row, model, waveID),
});
