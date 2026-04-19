// models/PlantModel.ts
import { PlantStat } from "../../utils/numbervalue";
import { Game } from "../scenes/Game";
import { BaseEntity } from "./core/BaseEntity";
import { PlantEntity } from "./entities/PlantEntity";

export abstract class PlantModel {
  public abstract readonly pid: number;
  public abstract readonly nameKey: string;
  public abstract readonly descriptionKey: string;
  public abstract readonly texturePath: string;

  // 核心数值定义 (使用PlantStat处理等级差异)
  public abstract maxHealth: PlantStat;
  public abstract cost: PlantStat;
  public abstract cooldown: PlantStat; // 单位ms
  public abstract cooldownStartAtRatio: number;// 0-1, 0表示无需等待，立即装填；1表示 游戏开始时需要完整等待cooldown
  public abstract damage: PlantStat;

  public abstract isNightPlant: boolean;
  public isTiny: boolean = false; // 是否为小型植物（会被skipTinyPlant忽略）

  // 行为接口：当植物准备就绪
  // 注意：传入的是 entity (实体对象)，Model本身不保存任何状态！
  public onCreate(_entity: PlantEntity) {
  };

  public onSleepStateChange(_entity: PlantEntity, _isSleeping: boolean) {
  };

  // 行为接口：当释放大招(星之碎片)时触发什么？
  public onStarShards(_entity: PlantEntity) {
  };

  public onHurt(_entity: PlantEntity, _damage: number, _realDamage: number, _dealer?: BaseEntity, _source?: BaseEntity) {

  };

  public onDeath(_entity: PlantEntity) { };

  protected initializeEntity<TEntity extends PlantEntity>(entity: TEntity): TEntity {
    return entity.initializeEntity();
  }

  public abstract createEntity(scene: Game, col: number, row: number, level: number): PlantEntity;
}
