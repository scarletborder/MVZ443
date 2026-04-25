import TickerManager, { FrameTimer } from "../../managers/combat/TickerManager";
import { PositionManager } from "../../managers/view/PositionManager";
import { BaseSfx, BaseSfxArgs } from "../BaseSfx";

export interface StarShardsOrbitSfxArgs extends BaseSfxArgs {
  baseDepth: number;
  viewGroup?: Phaser.GameObjects.Group;
  getAnchor: () => { x: number; y: number; active: boolean };
}

export class StarShardsOrbitSfx extends BaseSfx<StarShardsOrbitSfxArgs> {
  private sprites: Phaser.GameObjects.Image[] = [];
  private timer: FrameTimer | null = null;
  private angle = 0;

  play(): void {
    if (this.sprites.length > 0) return;

    const scale = PositionManager.Instance.scaleFactor;
    const orbitCount = 3;
    const anchor = this.args.getAnchor();

    this.sprites = Array.from({ length: orbitCount }, (_, index) => {
      const star = this.scene.add.image(anchor.x, anchor.y, "starshards")
        .setScale(0.28 * scale)
        .setOrigin(0.5)
        .setAlpha(0.95)
        .setDepth(this.args.baseDepth + 20);
      this.args.viewGroup?.add(star);
      star.setData("orbitOffset", index * Phaser.Math.PI2 / orbitCount);
      return star;
    });

    this.timer = TickerManager.Instance.addEvent({
      delay: 33,
      loop: true,
      callback: () => this.update(),
    });
    this.update();
  }

  private update(): void {
    if (this.stopped) return;
    const anchor = this.args.getAnchor();
    if (!anchor.active) return;

    const scale = PositionManager.Instance.scaleFactor;
    const centerX = anchor.x;
    const centerY = anchor.y - PositionManager.Instance.GRID_SIZEY * 0.82;
    const radiusX = PositionManager.Instance.GRID_SIZEX * 0.32;
    const radiusY = PositionManager.Instance.GRID_SIZEY * 0.16;
    this.angle += 0.12;

    this.sprites.forEach((star) => {
      const a = this.angle + (star.getData("orbitOffset") as number);
      const depthRatio = (Math.sin(a) + 1) / 2;
      star.setPosition(centerX + Math.cos(a) * radiusX, centerY + Math.sin(a) * radiusY)
        .setScale((0.22 + depthRatio * 0.12) * scale)
        .setAlpha(0.55 + depthRatio * 0.4)
        .setAngle(Phaser.Math.RadToDeg(a))
        .setDepth(this.args.baseDepth + 18 + Math.round(depthRatio * 4));
    });
  }

  stop(): void {
    super.stop();
    this.timer?.remove();
    this.timer = null;
    this.sprites.forEach((s) => s.destroy());
    this.sprites = [];
  }
}
