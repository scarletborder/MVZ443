import uniqueId from "lodash/uniqueId";
import { Game } from "../../scenes/Game";
import TickerManager, { TickerManagerProxy } from "../../managers/combat/TickerManager";
import RAPIER, { Vector } from "@dimforge/rapier2d-deterministic-compat";
import { CollisionContext } from "../../types";
import { DeferredManager } from "../../managers/DeferredManager";



// 无论是有血量的植物，还是没血量的子弹，它们都有位置、都有画面、都要在场景中被销毁
export abstract class BaseEntity {
  public scene: Game;
  public x: number;
  public y: number;

  public abstract baseDepth: number;

  // 计时器key
  private TimerKey: string;
  // 定时器代理
  public tickmanager: TickerManagerProxy;

  public rigidBody: RAPIER.RigidBody | null = null;
  // 统一的渲染容器
  public viewGroup: Phaser.GameObjects.Group;

  constructor(scene: Game, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.viewGroup = scene.add.group();
    this.TimerKey = uniqueId('entity_');
    this.tickmanager = new TickerManagerProxy(this.TimerKey);

    this.buildView();
  }

  public setVisible(visible: boolean) {
    // 设置可见性
    this.viewGroup.setVisible(visible);
  }

  // 抽象方法：强制子类自己实现怎么画 自己 和 物理体
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

  // 可以在每逻辑帧调用
  // 建议用来判断游戏相关的逻辑
  public stepUpdate(): void { }

  // 统一的销毁逻辑
  public destroy(): void {
    DeferredManager.Instance.defer(() => {
      if (this.rigidBody) {
        this.scene.rapierWorld.removeRigidBody(this.rigidBody);
      }
      this.viewGroup.destroy(true, true);
      TickerManager.Instance.RemoveGroup(this.TimerKey);
    });
  }

  public abstract onCollision(ctx: CollisionContext): void;
}