import { PositionManager } from "../../managers/view/PositionManager";
import { BaseSfx, BaseSfxArgs } from "../BaseSfx";

export interface StarShardsBurstSfxArgs extends BaseSfxArgs {
  x: number;
  y: number;
  baseDepth: number;
}

export class StarShardsBurstSfx extends BaseSfx<StarShardsBurstSfxArgs> {
  play(): void {
    const scene = this.scene;
    const scale = PositionManager.Instance.scaleFactor;
    const startX = this.args.x;
    const startY = this.args.y - PositionManager.Instance.GRID_SIZEY * 0.08;
    const baseDepth = this.args.baseDepth;
    const burstCount = 12;

    for (let i = 0; i < burstCount; i++) {
      const progress = burstCount <= 1 ? 0.5 : i / (burstCount - 1);
      const angle = Phaser.Math.DegToRad(Phaser.Math.Linear(205, 335, progress));
      const distance = Phaser.Math.Between(34, 72) * scale;
      const peakLift = Phaser.Math.Between(44, 92) * scale;
      const endX = startX + Math.cos(angle) * distance;
      const endY = startY + Math.sin(angle) * distance - peakLift;
      const controlX = (startX + endX) / 2 + Phaser.Math.Between(-12, 12) * scale;
      const controlY = Math.min(startY, endY) - Phaser.Math.Between(24, 54) * scale;
      const star = scene.add.image(startX, startY, "starshards")
        .setOrigin(0.5)
        .setScale(Phaser.Math.FloatBetween(0.18, 0.28) * scale)
        .setAlpha(0)
        .setAngle(Phaser.Math.Between(0, 360))
        .setDepth(baseDepth + 40);
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(startX, startY),
        new Phaser.Math.Vector2(controlX, controlY),
        new Phaser.Math.Vector2(endX, endY),
      );
      const tweenTarget = { t: 0 };

      scene.tweens.add({
        targets: tweenTarget,
        t: 1,
        duration: Phaser.Math.Between(560, 760),
        ease: "Cubic.easeOut",
        delay: i * 18,
        onUpdate: () => {
          const point = curve.getPoint(tweenTarget.t);
          star.setPosition(point.x, point.y);
          star.setAlpha(tweenTarget.t < 0.18 ? tweenTarget.t / 0.18 : 1 - Math.max(0, tweenTarget.t - 0.72) / 0.28);
          star.setScale((0.28 - tweenTarget.t * 0.08) * scale);
          star.angle += 8;
        },
        onComplete: () => star.destroy(),
      });
    }

    const glow = scene.add.circle(startX, startY, 8 * scale, 0xfff2a6, 0.62)
      .setDepth(baseDepth + 39);
    scene.tweens.add({
      targets: glow,
      y: startY - 22 * scale,
      scale: 3.2,
      alpha: 0,
      duration: 420,
      ease: "Sine.easeOut",
      onComplete: () => glow.destroy(),
    });
  }
}
