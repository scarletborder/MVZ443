import { PresetMonsterModel } from "../../../models/entities/MonsterEntity";
import { BaseSkeletonBowEntity } from "../../../models/entities/BaseSkeletonBowEntity";
import type { Game } from "../../../scenes/Game";
import { MonsterSpeed, ZombieAttackInterval } from "../../../../constants/game";


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
  baseSpeed: MonsterSpeed.SkeletonBow,
  attackDamage: 25,
  attackInterval: ZombieAttackInterval.SkeletonBow,
  createEntity: (scene, col, row, model, waveID) => new SkeletonBowEntity(scene, col, row, model, waveID),
});
