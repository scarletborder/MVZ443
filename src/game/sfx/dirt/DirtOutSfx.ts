import DepthUtils from "../../../utils/depth";
import { PositionManager } from "../../managers/view/PositionManager";
import { BaseSfx, BaseSfxArgs } from "../BaseSfx";

export interface DirtOutSfxArgs extends BaseSfxArgs {
  col: number;
  row: number;
  size?: { sizeX: number; sizeY: number };
}

export class DirtOutSfx extends BaseSfx<DirtOutSfxArgs> {
  play(): void {
    const scene = this.scene;
    if (!scene || !scene.anims) return;

    if (!scene.anims.exists('anime/dirt_out')) {
      scene.anims.create({
        key: 'anime/dirt_out',
        frames: scene.anims.generateFrameNumbers('anime/dirt_out', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0,
      });
    }

    const size = this.args.size ?? PositionManager.Instance.getPlantBodySize();
    const { x, y } = PositionManager.Instance.getPlantBottomCenter(this.args.col, this.args.row);

    const dirt = scene.add.sprite(x, y, 'anime/dirt_out', 0)
      .setDepth(DepthUtils.getPlantBasicDepth(this.args.row));
    dirt.setDisplaySize(size.sizeX, size.sizeY);
    dirt.setOrigin(0.5, 1).setVisible(true);
    dirt.anims.play('anime/dirt_out');

    dirt.once('animationcomplete', () => {
      dirt.destroy();
      this.args.onComplete?.();
    });
  }
}
