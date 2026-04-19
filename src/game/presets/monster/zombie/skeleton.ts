import { BaseSkeletonEntity, PresetMonsterModel } from "../../../models/entities/MonsterEntity";
import type { Game } from "../../../scenes/Game";


export class SkeletonEntity extends BaseSkeletonEntity {
  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
  }
}

export const SkeletonData = new PresetMonsterModel({
  mid: 6,
  nameKey: "Skeleton",
  level: 999,
  weight: () => 0,
  leastWaveID: 9999,
  maxHealth: 250,
  baseSpeed: 20,
  attackDamage: 20,
  createEntity: (scene, col, row, model, waveID) => new SkeletonEntity(scene, col, row, model, waveID),
});
