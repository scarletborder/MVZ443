import { BaseSkeletonEntity, PresetMonsterModel } from "../../../models/entities/MonsterEntity";
import type { Game } from "../../../scenes/Game";
import { MonsterSpeed, ZombieAttackInterval } from "../../../../constants/game";


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
  baseSpeed: MonsterSpeed.Skeleton,
  attackDamage: 20,
  attackInterval: ZombieAttackInterval.Skeleton,
  createEntity: (scene, col, row, model, waveID) => new SkeletonEntity(scene, col, row, model, waveID),
});
