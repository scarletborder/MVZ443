import uniqueId from "lodash/uniqueId";
import type { Game } from "../../scenes/Game";
import TickerManager, { TickerManagerProxy } from "../../managers/combat/TickerManager";
import RAPIER, { Vector } from "@dimforge/rapier2d-deterministic-compat";
import { CollisionContext } from "../../types";
import { DeferredManager } from "../../managers/DeferredManager";

// All entities share world position, visual state, and destruction lifecycle.
export abstract class BaseEntity {
  public scene: Game;
  public x: number;
  public y: number;

  public abstract baseDepth: number;

  // Timer key
  private TimerKey: string;
  // Timer proxy
  public tickmanager: TickerManagerProxy;

  public rigidBody: RAPIER.RigidBody | null = null;
  // Shared render container
  public viewGroup: Phaser.GameObjects.Group;
  private isDestroyQueued = false;
  private isDestroyed = false;

  constructor(scene: Game, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.viewGroup = scene.add.group();
    this.TimerKey = uniqueId("entity_");
    this.tickmanager = new TickerManagerProxy(this.TimerKey);
  }

  public setVisible(visible: boolean) {
    // Toggle visibility for the whole entity view.
    this.viewGroup.setVisible(visible);
  }

  // Subclasses decide how to build their own visuals and physics.
  protected abstract buildView(): void;

  public updateView(vec: Vector, rotation?: number): void {
    const dx = vec.x - this.x;
    const dy = vec.y - this.y;
    this.x = vec.x;
    this.y = vec.y;

    this.viewGroup.getChildren().forEach((child: any) => {
      if (child.x !== undefined) {
        child.x += dx;
        child.y += dy;
        if (rotation !== undefined && child.setRotation) {
          child.setRotation(rotation);
        }
      }
    });
  }

  // Logic-step hook.
  public stepUpdate(): void { }

  // Render-step hook for interpolation.
  public stepMove(_alpha: number): void { }

  // Shared destruction flow.
  public destroy(): void {
    if (this.isDestroyQueued || this.isDestroyed) {
      return;
    }
    this.isDestroyQueued = true;
    DeferredManager.Instance.defer(() => {
      if (this.isDestroyed) {
        return;
      }
      if (this.rigidBody) {
        this.scene.rapierWorld.removeRigidBody(this.rigidBody);
        this.rigidBody = null;
      }
      this.viewGroup.destroy(true, true);
      TickerManager.Instance.RemoveGroup(this.TimerKey);
      this.isDestroyed = true;
    });
  }

  public abstract onCollision(ctx: CollisionContext): void;
}
