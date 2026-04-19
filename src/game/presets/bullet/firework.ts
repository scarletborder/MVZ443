import { PositionManager } from "../../managers/view/PositionManager";
import { BulletEntity } from "../../models/projectiles/BulletEntity";
import { BulletConfig, BulletModel } from "../../models/projectiles/ProjectileModels";
import type { Game } from "../../scenes/Game";
import { ProjectileCmd } from "../../utils/cmd/ProjectileCmd";

export interface HFireWorkConfig extends BulletConfig {
  explodeDamage?: number;
}

export class HFireWorkModel extends BulletModel<HFireWorkConfig, HFireWorkEntity> {
  texture = 'bullet/Hfirework';
  public speed = 300;

  public createEntity(scene: Game, x: number, row: number, config: HFireWorkConfig): HFireWorkEntity {
    return new HFireWorkEntity(scene, x, row, this, config);
  }
}

export const HFireWorkData = new HFireWorkModel();

export class HFireWorkEntity extends BulletEntity {
  private explodeDamage: number;
  private smokeTimer: number = 0; // 限制产生烟雾的频率

  constructor(scene: Game, col: number, row: number, model: HFireWorkModel, cfg: HFireWorkConfig) {
    super(scene, col, row, model, cfg);
    this.explodeDamage = cfg.explodeDamage ?? 0;

    const size = PositionManager.Instance.getBulletDisplaySize();
    this.sprite.setDisplaySize(size.sizeX * 2, size.sizeY / 2);

    scene.musical.shootFireworkPool.play();

    // 创建动画（如果没有）
    if (!scene.anims.exists('rocket_smoke')) {
      scene.anims.create({
        key: 'rocket_smoke',
        frames: scene.anims.generateFrameNumbers('anime/death_smoke', { start: 0, end: 7 }),
        frameRate: 7,
        repeat: 0,
      });
    }
  }

  stepUpdate(): void {
    super.stepUpdate();

    this.smokeTimer++;
    if (this.smokeTimer < 5) return; // 每5帧产生一个烟雾，防止过多
    this.smokeTimer = 0;

    if (this.rigidBody) {
      const scene = this.scene;

      const vel = this.rigidBody.linvel();
      const angle = Math.atan2(vel.y, vel.x);

      const offsetX = -Math.cos(angle) * this.sprite.displayWidth * 0.5;
      const offsetY = -Math.sin(angle) * this.sprite.displayHeight * 0.5;

      const anime = scene.add.sprite(this.x + offsetX, this.y + offsetY, 'anime/death_smoke');
      anime.setDisplaySize(this.sprite.displayHeight * 2, this.sprite.displayHeight * 2)
        .setOrigin(0.5, 1)
        .setDepth(this.baseDepth + 1)
        .setAlpha(0);

      anime.play('rocket_smoke');

      scene.tweens.add({
        targets: anime,
        alpha: 1,
        duration: 500,
        ease: 'Linear',
        onComplete: () => {
          scene.tweens.add({
            targets: anime,
            alpha: 0,
            duration: 500,
            onComplete: () => {
              anime.destroy();
            }
          });
        }
      });
    }
  }

  destroy(): void {
    const scene = this.scene;

    // 发生爆炸
    if (scene && this.explodeDamage > 0) {
      const row = PositionManager.Instance.getRowByY(this.y);
      ProjectileCmd.CreateExplosion(scene, this.x, row, {
        damage: this.explodeDamage,
        rightGrid: 0.5,
        leftGrid: 0.25,
        upGrid: 0,
        faction: this.faction,
        dealer: this.dealer,
      });
    }

    super.destroy();
  }
}


