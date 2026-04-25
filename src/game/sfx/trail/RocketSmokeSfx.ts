import { BaseSfx, BaseSfxArgs } from "../BaseSfx";

export interface RocketSmokeSfxArgs extends BaseSfxArgs {
  x: number;
  y: number;
  size: number;
  depth: number;
}

export class RocketSmokeSfx extends BaseSfx<RocketSmokeSfxArgs> {
  play(): void {
    const scene = this.scene;

    if (!scene.anims.exists('rocket_smoke')) {
      scene.anims.create({
        key: 'rocket_smoke',
        frames: scene.anims.generateFrameNumbers('anime/death_smoke', { start: 0, end: 7 }),
        frameRate: 7,
        repeat: 0,
      });
    }

    const anime = scene.add.sprite(this.args.x, this.args.y, 'anime/death_smoke');
    anime.setDisplaySize(this.args.size, this.args.size)
      .setOrigin(0.5, 1)
      .setDepth(this.args.depth)
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
          onComplete: () => anime.destroy(),
        });
      },
    });
  }
}
