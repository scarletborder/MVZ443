import { SECKILL } from "../../../../public/constants";
import { PositionManager } from "../../managers/view/PositionManager";
import { BulletEntity } from "../../models/projectiles/BulletEntity";
import { BulletConfig, BulletModel } from "../../models/projectiles/ProjectileModels";
import { Game } from "../../scenes/Game";
import { CombatEntity } from "../../models/core/CombatEntity";
import { Faction } from "../../models/Enum";

export class MineCartModel extends BulletModel<BulletConfig, MineCartEntity> {
  texture = 'bullet/minecart';
  public speed = 0; // 初始速度为 0
  public penetratePower = 999; // 无限穿透
  public penetratedPunish = 1.0; // 伤害不衰减

  public createEntity(scene: Game, x: number, row: number, config: BulletConfig): MineCartEntity {
    return new MineCartEntity(scene, x, row, this, config);
  }
}

export const MineCartData = new MineCartModel();

export class MineCartEntity extends BulletEntity {
  constructor(scene: Game, col: number, row: number, model: MineCartModel, cfg: BulletConfig) {
    super(scene, col, row, model, cfg);

    // 设置初始伤害
    this.currentDamage = SECKILL;

    // 自定义大小
    const scaleFactor = PositionManager.Instance.scaleFactor;
    this.sprite.setDisplaySize(64 * scaleFactor, 64 * scaleFactor);
  }

  protected applyEffect(t: CombatEntity): void {
    super.applyEffect(t);

    // 如果还没有速度，说明是第一次碰撞，赋予速度 200
    if (this.rigidBody) {
      const currentVel = this.rigidBody.linvel();
      if (Math.abs(currentVel.x) < 1) {
        const velX = 200 * PositionManager.Instance.scaleFactor;
        const direction = this.faction === Faction.PLANT ? 1 : -1;
        this.rigidBody.setLinvel({ x: velX * direction, y: currentVel.y }, true);
      }
    }
  }

  stepUpdate() {
    super.stepUpdate();

    // 超过屏幕边界销毁
    const screenWidth = this.scene.sys.canvas.width;
    if (this.x > screenWidth * 1.2) {
      console.log('minecart out of screen');
      this.destroy();
    }
  }
}
