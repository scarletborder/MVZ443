import { Game } from "../scenes/Game";
import { BaseEntity } from "./core/BaseEntity";
import { ObstacleConfig, ObstacleEntity } from "./entities/ObstacleEntity";

export abstract class ObstacleModel {
  public abstract readonly oid: number;
  public abstract readonly nameKey: string;
  public abstract readonly texturePath: string;

  public onCreate(_entity: ObstacleEntity) { }

  public onHurt(_entity: ObstacleEntity, _damage: number, _realDamage: number, _dealer?: BaseEntity, _source?: BaseEntity) { }

  public onDeath(_entity: ObstacleEntity) { }

  public abstract createEntity(scene: Game, col: number, row: number, config: ObstacleConfig): ObstacleEntity;
}
