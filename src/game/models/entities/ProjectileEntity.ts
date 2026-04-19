import RAPIER from "@dimforge/rapier2d-deterministic-compat";
import type { Game } from "../../scenes/Game";
import { CollisionContext } from "../../types";
import { BaseEntity } from "../core/BaseEntity";
import { CombatEntity } from "../core/CombatEntity";
import { ProjectileConfig, ProjectileModel } from "../projectiles/ProjectileModels";
import { Faction } from "../Enum";
import { MonsterEntity } from "./MonsterEntity";
import { _Typedebuffs } from "../../../constants/game";

export abstract class ProjectileEntity<T extends ProjectileModel<any, any>> extends BaseEntity {
  public model: T;
  public faction: Faction;

  // 运行时状态
  public currentDamage: number;
  public hasAttacked: Set<BaseEntity> = new Set(); // 记录已经打过的实体

  public dealer: CombatEntity | undefined; // 伤害来源实体（比如子弹的发射者）

  couldAttackFlying: boolean = false; // 是否能攻击飞行单位（默认为false，表示只能攻击地面单位）
  debuff: _Typedebuffs = null;
  debuffDuration: number = 0;

  constructor(scene: Game, x: number, y: number, model: T, cfg: ProjectileConfig) {
    super(scene, x, y);
    this.model = model;
    this.currentDamage = model.damage;
    this.faction = cfg.faction;
    this.dealer = cfg.dealer;

    this.couldAttackFlying = cfg.couldAttackFlying ?? model.couldAttackFlying;
    this.debuff = cfg.debuff ?? model.debuff;
    this.debuffDuration = cfg.debuffDuration ?? model.debuffDuration;
  }

  // 通用的碰撞分发器
  public onCollision(ctx: CollisionContext): void {
    // 判断是否为战斗实体
    if (!(ctx.targetEntity instanceof CombatEntity)) return;

    // 基本条件过滤
    if (!ctx.targetEntity.takeDamage) return; // 不是可受击对象
    if (this.hasAttacked.has(ctx.targetEntity)) return; // 已经攻击过
    if (ctx.targetEntity.faction === this.faction) return; // 阵营不符

    // 基本条件过滤
    if (!ctx.targetEntity.takeDamage) return; // 不是可受击对象
    if (this.hasAttacked.has(ctx.targetEntity)) return; // 已经攻击过
    if (ctx.targetEntity.faction === this.faction) return; // 阵营不符

    // 高度/飞行逻辑判断
    if (this.couldAttackFlying === false) {
      if (ctx.targetEntity instanceof MonsterEntity &&
        ctx.targetEntity.isFlying) return; // 地面子弹打不到天上
    }

    // 虚空/黑夜逻辑
    if (ctx.targetEntity instanceof MonsterEntity && ctx.targetEntity.isInVoid) return;

    // 【具体生效逻辑交由子类实现】
    this.applyEffect(ctx.targetEntity);
  }

  // 由子弹、激光、爆炸各自重写生效逻辑
  protected abstract applyEffect(target: CombatEntity): void;

  // 通用创建传感器的物理体
  protected createSensor(width: number, height: number, rotation: number = 0) {
    const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased()
      .setTranslation(this.x, this.y)
      .setRotation(rotation);

    rigidBodyDesc.setUserData(this);

    this.rigidBody = this.scene.rapierWorld.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2);
    colliderDesc.setSensor(true); // 设为传感器，不产生物理碰撞体积
    colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    this.scene.rapierWorld.createCollider(colliderDesc, this.rigidBody);
  }
}