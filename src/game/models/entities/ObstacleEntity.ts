import RAPIER, { Vector } from "@dimforge/rapier2d-deterministic-compat";
import DepthUtils from "../../../utils/depth";
import ObstacleManager from "../../managers/combat/ObstacleManager";
import { PositionManager } from "../../managers/view/PositionManager";
import type { Game } from "../../scenes/Game";
import { CollisionContext } from "../../types/CollisionTypes";
import { CombatEntity } from "../core/CombatEntity";
import { BaseEntity } from "../core/BaseEntity";
import { Faction } from "../Enum";
import { ObstacleModel } from "../ObstacleModel";

export interface ObstacleConfig {
  hp: number;
  faction: Faction;
  summoner?: BaseEntity;
  waveId?: number;
}

export abstract class ObstacleEntity extends CombatEntity {
  public model: ObstacleModel;

  public col: number;
  public row: number;
  public baseDepth: number;

  public summoner?: BaseEntity;
  public health: number;

  constructor(scene: Game, col: number, row: number, model: ObstacleModel, config: ObstacleConfig) {
    const { x, y } = PositionManager.Instance.getPlantBottomCenter(col, row);
    super(scene, x, y, config.hp, config.faction);

    this.model = model;
    this.col = col;
    this.row = row;
    this.baseDepth = DepthUtils.getPlantBasicDepth(row);

    this.summoner = config.summoner;
    this.health = config.hp;

    this.buildView();
    this.buildPhysics();
    ObstacleManager.Instance.RegisterObstacle(this);
    this.model.onCreate(this);
  }

  public get oid() {
    return this.model.oid;
  }

  private buildPhysics() {
    const physicBodySize = PositionManager.Instance.getPlantBodySize();
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(this.x, this.y);

    rigidBodyDesc.setUserData(this);

    this.rigidBody = this.scene.rapierWorld.createRigidBody(rigidBodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(physicBodySize.sizeX / 2, physicBodySize.sizeY / 2);
    colliderDesc.setSensor(true);
    colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    this.scene.rapierWorld.createCollider(colliderDesc, this.rigidBody);
  }

  protected abstract buildView(): void;

  public override takeDamage(amount: number, dealer?: BaseEntity, source?: BaseEntity): void {
    super.takeDamage(amount, dealer, source);
    this.health = this.currentHealth;
  }

  protected onHurt(amount: number, realDamage: number, dealer?: BaseEntity, source?: BaseEntity): void {
    this.model.onHurt(this, amount, realDamage, dealer, source);
  }

  protected onDeath(): void {
    this.model.onDeath(this);
  }

  public onCollision(_ctx: CollisionContext): void {
    // Obstacle itself does not actively process collision logic for now.
  }

  public override updateView(vec: Vector) {
    const dx = vec.x - this.x;
    const dy = vec.y - this.y;

    if (dx === 0 && dy === 0) return;

    this.x = vec.x;
    this.y = vec.y;

    const children = this.viewGroup.getChildren();
    for (let i = 0; i < children.length; i++) {
      const part = children[i] as any;
      if (!part) continue;
      part.x += dx;
      part.y += dy;
    }
  }

  public override destroy() {
    this.model.onDeath(this);
    ObstacleManager.Instance.UnregisterObstacle(this);
    super.destroy();
  }
}
