import { PositionManager } from "../../managers/view/PositionManager";
import { BulletEntity } from "../../models/projectiles/BulletEntity";
import { BulletConfig, BulletModel } from "../../models/projectiles/ProjectileModels";
import type { Game } from "../../scenes/Game";
import { ProjectileCmd } from "../../utils/cmd/ProjectileCmd";
import { SfxCmd } from "../../utils/cmd/SfxCmd";
import { RocketSmokeSfx } from "../../sfx/trail/RocketSmokeSfx";

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

  constructor(scene: Game, x: number, row: number, model: HFireWorkModel, cfg: HFireWorkConfig) {
    super(scene, x, row, model, cfg);
    this.explodeDamage = cfg.explodeDamage ?? 0;

    const size = PositionManager.Instance.getBulletDisplaySize();
    this.sprite.setDisplaySize(size.sizeX * 2, size.sizeY / 2);

    scene.musical.shootFireworkPool.play();
  }

  stepUpdate(): void {
    super.stepUpdate();

    this.smokeTimer++;
    if (this.smokeTimer < 5) return; // 每5帧产生一个烟雾，防止过多
    this.smokeTimer = 0;

    if (this.rigidBody) {
      const vel = this.rigidBody.linvel();
      const angle = Math.atan2(vel.y, vel.x);
      const offsetX = -Math.cos(angle) * this.sprite.displayWidth * 0.5;
      const offsetY = -Math.sin(angle) * this.sprite.displayHeight * 0.5;

      SfxCmd.Create(RocketSmokeSfx, {
        scene: this.scene,
        x: this.x + offsetX,
        y: this.y + offsetY,
        size: this.sprite.displayHeight * 2,
        depth: this.baseDepth + 1,
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


