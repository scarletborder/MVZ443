// models/monsters/MonsterModel.ts

import { Game } from "../scenes/Game";
import { MonsterEntity } from "./entities/MonsterEntity";

export abstract class MonsterModel {
  public abstract readonly mid: number;
  public abstract readonly nameKey: string;
  public abstract readonly texturePath: string;

  // 刷怪相关
  public abstract readonly level: number; // 怪物等级，用于关卡配置时的权重计算
  public abstract readonly weight: (waveID: number) => number; // 刷怪权重算法
  public abstract readonly leastWaveIDByStageID?: (stageID: number) => number; // 可选的阶段限制算法，返回该怪物在特定关卡中最早出现的波次ID
  public abstract readonly leastWaveID?: number; // 可选的全局阶段限制，返回该怪物最早出现的波次ID(优先级低于 leastWaveIDByStageID)

  public readonly rank: 'normal' | 'elite' | 'boss';

  // 基础属性
  public abstract readonly maxHealth: number;
  public abstract readonly baseSpeed: number; // 默认移动速度
  public abstract readonly attackDamage: number; // 单次攻击伤害
  public abstract readonly attackInterval: number; // 攻击间隔 (ms)

  // 特性标志
  public readonly isDefaultFlying: boolean;
  public readonly isDefaultInVoid: boolean;
  public readonly couldCarryStarShards: boolean;

  // 刷怪权重算法
  public abstract getWeight(waveID: number): number;

  // 工厂方法：生成对应的僵尸实体 (表现层)
  public abstract createEntity(scene: Game, col: number, row: number, waveID: number): MonsterEntity;
}