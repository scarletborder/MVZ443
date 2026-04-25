import { BaseSfx, BaseSfxArgs } from "../BaseSfx";

export interface DeathSmokeSfxArgs extends BaseSfxArgs {
  x: number;
  y: number;
  depth: number;
  displaySize?: number;
}

export class DeathSmokeSfx extends BaseSfx<DeathSmokeSfxArgs> {
  play(): void {
    const scene = this.scene;
    scene.musical.zombieDeathPool.play();

    const size = this.args.displaySize ?? 100;
    const smoke = scene.add.sprite(this.args.x, this.args.y, "anime/death_smoke")
      .setDisplaySize(size, size)
      .setOrigin(0.5, 1)
      .setDepth(this.args.depth);
    smoke.play("death_smoke");
    smoke.once("animationcomplete", () => {
      smoke.destroy();
      this.args.onComplete?.();
    });
  }
}
