import { Game } from "../scenes/Game";
import { BaseEntity } from "./core/BaseEntity";
import { MonsterEntity } from "./entities/MonsterEntity";

export abstract class MonsterModel {
  public abstract readonly mid: number;
  public abstract readonly nameKey: string;
  public abstract readonly texturePath: string;

  public abstract readonly level: number;
  public abstract readonly weight: (waveID: number) => number;
  public abstract readonly leastWaveIDByStageID?: (stageID: number) => number;
  public abstract readonly leastWaveID?: number;

  public readonly rank: "normal" | "elite" | "boss" = "normal";

  public abstract readonly maxHealth: number;
  public abstract readonly baseSpeed: number;
  public abstract readonly attackDamage: number;
  public abstract readonly attackInterval: number;

  public readonly isDefaultFlying: boolean = false;
  public readonly isDefaultInVoid: boolean = false;
  public readonly couldCarryStarShards: boolean = true;

  public abstract getWeight(waveID: number): number;

  public onCreate(entity: MonsterEntity) { }

  public onHurt(entity: MonsterEntity, damage: number, realDamage: number, dealer?: BaseEntity, source?: BaseEntity) { }

  public onDeath(entity: MonsterEntity) { }

  public abstract createEntity(scene: Game, col: number, row: number, waveID: number): MonsterEntity;
}
