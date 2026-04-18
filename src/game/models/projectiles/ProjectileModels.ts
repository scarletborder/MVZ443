import { _Typedebuffs } from "../../../constants/game";
import { PositionManager } from "../../managers/view/PositionManager";
import { Game } from "../../scenes/Game";
import { CombatEntity } from "../core/CombatEntity";
import { ProjectileEntity } from "../entities/ProjectileEntity";
import { Faction } from "../Enum";
import { BulletEntity } from "./BulletEntity";
import { ExplosionEntity } from "./ExplosionEntity";
import { LaserEntity } from "./LaserEntity";


export abstract class ProjectileModel<TConfig, TEntity extends ProjectileEntity<any>> {
  public damage: number = 0;

  // Buff 效果
  public debuff: _Typedebuffs = null;
  public debuffDuration: number = 0;

  public couldAttackFlying = false; // 是否能攻击飞行单位（默认为false，表示只能攻击地面单位）
  // 抽象工厂方法，由具体子类决定如何使用 Config 和 Scene 生成 Entity
  public abstract createEntity(scene: Game, x: number, row: number, config: TConfig): TEntity;
}

export interface ProjectileConfig {
  damage: number;
  faction: Faction;
  dealer?: CombatEntity;

  debuff?: _Typedebuffs;
  debuffDuration?: number;

  couldAttackFlying?: boolean; // 是否能攻击飞行单位（默认为false，表示只能攻击地面单位）
}

export interface BulletConfig extends ProjectileConfig {
  maxDistance?: number;
  bounceable?: boolean; // 是否可以被反弹
  speed?: number; // 子弹速度
  penetratePower?: number; // 穿透能力
  penetratedPunish?: number; // 穿透后伤害衰减系数
  skipTiny?: boolean; // 是否跳过小型单位，默认为true
}

export class BulletModel<TConfig extends BulletConfig = BulletConfig, TEntity extends BulletEntity = BulletEntity> extends ProjectileModel<TConfig, TEntity> {
  public texture: string;
  public speed: number = 500;
  // 穿透能力
  public penetratePower: number = 1;
  public penetratedPunish: number = 0.5; // 穿透后伤害系数

  createEntity(scene: Game, x: number, row: number, config: TConfig): TEntity {
    return new BulletEntity(scene, x, row, this, config) as TEntity;
  }
}

export interface ExplosionConfig extends ProjectileConfig {
  leftGrid: number;// 本格=0.5，右格=1
  rightGrid: number;
  upGrid: number;
  downGrid?: number;
}

export class ExplosionModel<TConfig extends ExplosionConfig = ExplosionConfig, TEntity extends ExplosionEntity = ExplosionEntity> extends ProjectileModel<TConfig, TEntity> {
  public disableAnime: boolean = false;

  couldAttackFlying = true;

  public createEntity(scene: Game, x: number, row: number, config: TConfig): TEntity {
    return new ExplosionEntity(scene, x, row, this, config) as TEntity;
  }
}

export interface LaserConfig extends ProjectileConfig {
  duration: number;
  distance: number;

  invisible?: boolean;
  color?: number;
  alphaFrom?: number;
  alphaTo?: number;
}

export class LaserModel<TConfig extends LaserConfig = LaserConfig, TEntity extends LaserEntity = LaserEntity> extends ProjectileModel<TConfig, TEntity> {
  public duration: number = 400; // 激光持续时间
  public distance: number = 12; // 激光长度(格)

  // 视觉参数
  public invisible: boolean = false;
  public color: number = 0xffffff;
  // 透明渐变
  public alphaFrom: number = 0.2;
  public alphaTo: number = 0.5;

  public createEntity(scene: Game, x: number, row: number, config: TConfig): TEntity {
    const y0 = PositionManager.Instance.getRowCenterY(row); // 获取行中心坐标
    const x2 = x + this.distance * PositionManager.Instance.GRID_SIZEX;

    return new LaserEntity(scene, x, y0, x2, y0, this, row, config) as TEntity;
  }
}