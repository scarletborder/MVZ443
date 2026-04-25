import DepthUtils from "../../../utils/depth";
import { PositionManager } from "../../managers/view/PositionManager";
import { BaseSfx, BaseSfxArgs } from "../BaseSfx";

export interface ArcSfxArgs extends BaseSfxArgs {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  texture: string;
  duration: number;
  arcHeight?: number;
}

export class ArcSfx extends BaseSfx<ArcSfxArgs> {
  play(): void {
    const { x1, y1, x2, y2, texture, duration, arcHeight: rawArcHeight } = this.args;

    const arcHeight = (rawArcHeight ?? 200) * PositionManager.Instance.scaleFactor;
    const start = new Phaser.Math.Vector2(x1, y1);
    const end = new Phaser.Math.Vector2(x2, y2);
    const controlPoint = new Phaser.Math.Vector2(
      (x1 + x2) / 2,
      Math.min(y1, y2) - arcHeight
    );

    const curve = new Phaser.Curves.QuadraticBezier(start, controlPoint, end);
    const tempImage = this.scene.add.image(x1, y1, texture)
      .setDepth(DepthUtils.getProjectileDepth('projectile', 0));

    const path = { t: 0, vec: new Phaser.Math.Vector2() };

    this.scene.tweens.add({
      targets: path,
      t: 1,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        curve.getPoint(path.t, path.vec);
        tempImage.setPosition(path.vec.x, path.vec.y);
      },
      onComplete: () => {
        tempImage.destroy();
        this.args.onComplete?.();
      }
    });
  }
}
