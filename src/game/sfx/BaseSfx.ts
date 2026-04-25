import type { Game } from "../scenes/Game";

export interface BaseSfxArgs {
  scene: Game;
  onComplete?: () => void;
}

export abstract class BaseSfx<TArgs extends BaseSfxArgs = BaseSfxArgs> {
  protected scene: Game;
  protected args: TArgs;
  protected stopped = false;

  constructor(args: TArgs) {
    this.scene = args.scene;
    this.args = args;
  }

  abstract play(): void;

  stop(): void {
    this.stopped = true;
  }
}
