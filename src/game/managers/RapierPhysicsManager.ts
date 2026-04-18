import RAPIER from '@dimforge/rapier2d-deterministic-compat';
import { Game } from '../scenes/Game';

/**
 * RAPIER 物理管理器
 * 负责管理物理世界的创建、更新和碰撞检测
 * 
 * 注意：物理世界坐标直接对应游戏世界坐标，不需要处理显示缩放
 * FIT 模式的缩放只影响显示层面，不影响物理计算
 */
export class RapierPhysicsManager {
  private world: RAPIER.World;
  private game: Game;

  // 碰撞体映射：Phaser 精灵 -> RAPIER 刚体
  private bodyMap: Map<Phaser.GameObjects.Sprite, RAPIER.RigidBody> = new Map();

  // 碰撞回调存储
  private collisionCallbacks: Map<string, (a: Phaser.GameObjects.Sprite, b: Phaser.GameObjects.Sprite) => void> = new Map();

  /**
   * 构造函数
   * @param game Phaser 场景
   * @param gravity 重力设置 (通常为 {x: 0, y: 0} 因为这是一个横版游戏)
   */
  constructor(game: Game, gravity: { x: number; y: number } = { x: 0, y: 0 }) {
    this.game = game;
    this.world = new RAPIER.World(gravity);
  }

  /**
   * 获取 RAPIER 物理世界
   */
  getWorld(): RAPIER.World {
    return this.world;
  }

  /**
   * 创建碰撞体（用于替代 Phaser Physics）
   * 物理世界坐标直接对应游戏世界坐标，不需要缩放转换
   * @param sprite 精灵对象
   * @param width 碰撞体宽度
   * @param height 碰撞体高度
   * @param isKinematic 是否为运动学体（不受力影响）
   */
  createBody(
    sprite: Phaser.GameObjects.Sprite,
    width: number,
    height: number,
    isKinematic: boolean = false
  ): RAPIER.RigidBody {
    const x = sprite.x;
    const y = sprite.y;

    let bodyDesc: RAPIER.RigidBodyDesc;

    if (isKinematic) {
      // 运动学体：可以通过位置设置移动，但不受力影响
      bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(x, y);
    } else {
      // 动态体
      bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y);
    }

    const body = this.world.createRigidBody(bodyDesc);

    // 创建碰撞体 (width 和 height 是完整的宽高，需要除以2)
    const colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2);
    this.world.createCollider(body, colliderDesc);

    // 存储映射
    this.bodyMap.set(sprite, body);

    return body;
  }

  /**
   * 更新精灵位置到物理体
   * @param sprite 精灵
   */
  updateBodyPosition(sprite: Phaser.GameObjects.Sprite) {
    const body = this.bodyMap.get(sprite);
    if (body) {
      const x = sprite.x;
      const y = sprite.y;
      body.setTranslation({ x, y }, true);
    }
  }

  /**
   * 设置精灵位置从物理体
   * @param sprite 精灵
   */
  updateSpritePosition(sprite: Phaser.GameObjects.Sprite) {
    const body = this.bodyMap.get(sprite);
    if (body) {
      const trans = body.translation();
      sprite.x = trans.x;
      sprite.y = trans.y;
    }
  }

  /**
   * 移除物理体
   * @param sprite 精灵
   */
  removeBody(sprite: Phaser.GameObjects.Sprite) {
    const body = this.bodyMap.get(sprite);
    if (body) {
      this.world.removeRigidBody(body);
      this.bodyMap.delete(sprite);
    }
  }

  /**
   * 检测两个组之间的碰撞
   * @param groupA 第一个精灵组
   * @param groupB 第二个精灵组
   * @param callback 碰撞回调函数
   */
  setupOverlap(
    groupA: Phaser.Physics.Arcade.Group | Phaser.GameObjects.Sprite[],
    groupB: Phaser.Physics.Arcade.Group | Phaser.GameObjects.Sprite[],
    callback: (a: Phaser.GameObjects.Sprite, b: Phaser.GameObjects.Sprite) => void
  ) {
    const key = `${groupA}_${groupB}`;
    this.collisionCallbacks.set(key, callback);
  }

  /**
   * 更新物理世界（检测碰撞）
   */
  update() {
    // 更新物理模拟
    this.world.step();

    // 检测碰撞对
    const contactPairs = this.world.contactPairs();

    for (let contactPair of contactPairs) {
      if (contactPair.numContacts() > 0) {
        // 获取两个碰撞体
        const body1 = contactPair.rigid1();
        const body2 = contactPair.rigid2();

        // 查找对应的精灵
        let sprite1: Phaser.GameObjects.Sprite | null = null;
        let sprite2: Phaser.GameObjects.Sprite | null = null;

        for (const [sprite, body] of this.bodyMap.entries()) {
          if (body.handle === body1.handle) sprite1 = sprite as Phaser.GameObjects.Sprite;
          if (body.handle === body2.handle) sprite2 = sprite as Phaser.GameObjects.Sprite;
        }

        if (sprite1 && sprite2) {
          // 调用所有相关的碰撞回调
          for (const callback of this.collisionCallbacks.values()) {
            callback(sprite1, sprite2);
          }
        }
      }
    }
  }

  /**
   * 暂停物理模拟
   */
  pause() {
    // RAPIER 没有内置的暂停功能，需要通过标志来控制
    // 可以设置重力为 0 或跳过 update 调用
  }

  /**
   * 恢复物理模拟
   */
  resume() {
    // 恢复重力或重新启用 update
  }

  /**
   * 销毁物理管理器
   */
  destroy() {
    this.world = null as any;
    this.bodyMap.clear();
    this.collisionCallbacks.clear();
  }

  /**
   * 获取碰撞体
   */
  getBody(sprite: Phaser.GameObjects.Sprite): RAPIER.RigidBody | undefined {
    return this.bodyMap.get(sprite);
  }

  /**
   * 检查两个物体是否接触
   */
  isOverlapping(sprite1: Phaser.GameObjects.Sprite, sprite2: Phaser.GameObjects.Sprite): boolean {
    const body1 = this.bodyMap.get(sprite1);
    const body2 = this.bodyMap.get(sprite2);

    if (!body1 || !body2) return false;

    // 检查这两个体之间是否有接触
    let contactPairs = this.world.contactPairs();
    for (let pair of contactPairs) {
      if (
        (pair.rigid1().handle === body1.handle && pair.rigid2().handle === body2.handle) ||
        (pair.rigid1().handle === body2.handle && pair.rigid2().handle === body1.handle)
      ) {
        return pair.numContacts() > 0;
      }
    }

    return false;
  }

  /**
   * 禁用物理体（移除刚体）
   */
  disableBody(sprite: Phaser.GameObjects.Sprite) {
    const body = this.bodyMap.get(sprite);
    if (body) {
      this.world.removeRigidBody(body);
      this.bodyMap.delete(sprite);
    }
  }

  /**
   * 启用物理体（重新创建刚体）
   */
  enableBody(sprite: Phaser.GameObjects.Sprite, width: number, height: number, isKinematic: boolean = false) {
    // 如果已经存在物理体，先移除
    this.disableBody(sprite);
    // 重新创建物理体
    this.createBody(sprite, width, height, isKinematic);
  }
}
