import DepthUtils from "../../../utils/depth";
import { defaultRandom } from "../../../utils/random";
import { BaseSfx, BaseSfxArgs } from "../BaseSfx";

export interface ExplosionSfxArgs extends BaseSfxArgs {
  x: number;
  y: number;
  totalWidth: number;
  totalHeight: number;
  leftWidth: number;
  downHeight: number;
  baseSize: number;
  viewGroup?: Phaser.GameObjects.Group;
}

export class ExplosionSfx extends BaseSfx<ExplosionSfxArgs> {
  play(): void {
    const { x, y, totalWidth, totalHeight, leftWidth, downHeight, baseSize, viewGroup } = this.args;
    const scene = this.scene;

    scene.musical.explodeAudio.play(`explode${Math.floor(Math.random() * 3) + 1}`);

    const spriteBaseSize = baseSize * 0.6;
    const cols = Math.ceil(totalWidth / spriteBaseSize);
    const rows = Math.ceil(totalHeight / spriteBaseSize);

    if (!scene.anims.exists('explosion')) {
      scene.anims.create({
        key: 'explosion',
        frames: scene.anims.generateFrameNumbers('anime/explosion', { start: 0, end: 15 }),
        frameRate: 30,
        repeat: 0,
      });
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const baseX = x - leftWidth + (col + 0.5) * spriteBaseSize;
        const baseY = y - downHeight + (row + 0.5) * spriteBaseSize;

        for (let i = 0; i < (defaultRandom() < 0.5 ? 2 : 1); i++) {
          const finalX = baseX + (defaultRandom() - 0.5) * spriteBaseSize * 0.8;
          const finalY = baseY + (defaultRandom() - 0.5) * spriteBaseSize * 0.8;
          const scale = 0.8 + defaultRandom() * 0.6;

          const anime = scene.add.sprite(finalX, finalY, 'anime/explosion')
            .setDisplaySize(spriteBaseSize * scale, spriteBaseSize * scale)
            .setDepth(DepthUtils.getInGameUIElementDepth(-100))
            .setRotation(defaultRandom() * Math.PI * 2);

          viewGroup?.add(anime);

          scene.time.delayedCall(150 * defaultRandom(), () => {
            if (!anime.scene) return;
            anime.play('explosion');
            anime.once('animationcomplete', () => anime.destroy());
          });
        }
      }
    }
  }
}
