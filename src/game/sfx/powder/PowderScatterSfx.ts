import { PositionManager } from "../../managers/view/PositionManager";
import { BaseSfx, BaseSfxArgs } from "../BaseSfx";

export interface PowderScatterSfxArgs extends BaseSfxArgs {
  x: number;
  y: number;
  depth: number;
  color: number;
  count?: number;
  rangeWidth?: number;
  rangeHeight?: number;
  duration?: number;
}

export class PowderScatterSfx extends BaseSfx<PowderScatterSfxArgs> {
  play(): void {
    const posManager = PositionManager.Instance;
    const centerX = this.args.x;
    const centerY = this.args.y - posManager.GRID_SIZEY / 2;
    const rangeWidth = this.args.rangeWidth ?? posManager.GRID_SIZEX;
    const rangeHeight = this.args.rangeHeight ?? posManager.GRID_SIZEY;
    const rectWidth = posManager.GRID_SIZEX / 15;
    const rectHeight = posManager.GRID_SIZEX / 15;
    const rectCount = this.args.count ?? 15;
    const duration = this.args.duration ?? 1600;

    for (let i = 0; i < rectCount; i++) {
      const posX = Phaser.Math.Between(centerX - rangeWidth / 2, centerX + rangeWidth / 2);
      const posY = Phaser.Math.Between(centerY - rangeHeight / 2, centerY + rangeHeight / 2);

      const graphics = this.scene.add.graphics({ fillStyle: { color: this.args.color } })
        .setDepth(this.args.depth);
      graphics.fillRect(posX - rectWidth / 2, posY - rectHeight / 2, rectWidth, rectHeight);

      this.scene.tweens.add({
        targets: graphics,
        alpha: 0.2,
        duration,
        ease: 'Linear',
        onComplete: () => graphics.destroy(),
      });
    }
  }
}
