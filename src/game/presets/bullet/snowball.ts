import { BulletEntity } from "../../models/projectiles/BulletEntity";
import { BulletConfig, BulletModel } from "../../models/projectiles/ProjectileModels";
import { Game } from "../../scenes/Game";
import ProjectileDamage from "../../../constants/damage";
import { ProjectileCmd } from "../../utils/cmd/ProjectileCmd";
import { PositionManager } from "../../managers/view/PositionManager";

export class SnowBallModel extends BulletModel<BulletConfig, SnowBallEntity> {
  texture = 'bullet/snowball';
  public createEntity(scene: Game, x: number, row: number, config: BulletConfig): SnowBallEntity {
    return new SnowBallEntity(scene, x, row, this, config);
  }
}

export const SnowBallData = new SnowBallModel();

export class SnowBallEntity extends BulletEntity {
  constructor(scene: Game, col: number, row: number, model: SnowBallModel, cfg: BulletConfig) {
    super(scene, col, row, model, cfg);
    scene.musical.shootArrowPool.play();
  }
}

export class BombSnowBallModel extends BulletModel<BulletConfig, BombSnowBallEntity> {
  texture = 'bullet/snowball';
  public createEntity(scene: Game, x: number, row: number, config: BulletConfig): BombSnowBallEntity {
    return new BombSnowBallEntity(scene, x, row, this, config);
  }
}

export const BombSnowBallData = new BombSnowBallModel();

export class BombSnowBallEntity extends SnowBallEntity {
  destroy(): void {
    const scene = this.scene;

    if (scene && ProjectileDamage.bullet && ProjectileDamage.bullet.bomb_fireBall_splash) {
      const dmg = ProjectileDamage.bullet.bomb_fireBall_splash;
      const row = PositionManager.Instance.getRowByY(this.y);
      ProjectileCmd.CreateExplosion(scene, this.x, row, {
        damage: dmg,
        rightGrid: 1.75,
        leftGrid: 1.5,
        upGrid: 1,
        faction: this.faction,
        dealer: this.dealer,
      });
    }

    super.destroy();
  }
}
