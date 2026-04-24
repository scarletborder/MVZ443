import { translate } from "../../../i18n";
import type { Game } from "../../scenes/Game";
import { DEBUG_TOGGLE_KEY } from "../../../constants/game";
import DepthUtils from "../../../utils/depth";
import { BaseManager } from "../BaseManager";

export default class DebugManager extends BaseManager {
  private static _instance: DebugManager;
  protected scene: Game | null = null;
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;
  private debugHintText: Phaser.GameObjects.Text | null = null;
  private debugEnabled = false;
  private debugKey: Phaser.Input.Keyboard.Key | null = null;

  constructor() {
    super();
  }

  public Load(): void {
    const baseDepth = DepthUtils.getMenuDepth() - 10;
    if (!this.scene?.innerSettings.isDebug) {
      return;
    }

    this.debugGraphics = this.scene.add.graphics();
    this.debugGraphics.setDepth(baseDepth);

    this.debugHintText = this.scene.add.text(10, 10, translate("game.debugHint", { key: DEBUG_TOGGLE_KEY }), {
      fontSize: '16px',
      color: '#00ff00',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      padding: { x: 8, y: 6 },
    }).setDepth(baseDepth + 1);

    this.debugKey = this.scene.input.keyboard?.addKey(DEBUG_TOGGLE_KEY) ?? null;
    this.debugKey?.on('down', this.toggleDebug, this);
  }

  public setScene(scene: Game) {
    this.scene = scene;
  }

  public static get Instance(): DebugManager {
    if (!this._instance) {
      this._instance = new DebugManager();
    }
    return this._instance;
  }

  public update(): void {
    if (!this.scene || !this.debugGraphics) {
      return;
    }

    this.debugGraphics.clear();

    if (!this.debugEnabled || !this.scene.rapierWorld) {
      return;
    }

    const debugRender = this.scene.rapierWorld.debugRender();
    const vertices = debugRender.vertices;
    const colors = debugRender.colors;

    for (let i = 0; i < vertices.length; i += 4) {
      const x1 = vertices[i];
      const y1 = vertices[i + 1];
      const x2 = vertices[i + 2];
      const y2 = vertices[i + 3];

      const colorIndex = i * 2;
      const r = colors[colorIndex] ?? 1;
      const g = colors[colorIndex + 1] ?? 1;
      const b = colors[colorIndex + 2] ?? 1;
      const a = colors[colorIndex + 3] ?? 1;

      this.debugGraphics.lineStyle(
        2,
        Phaser.Display.Color.GetColor(r * 255, g * 255, b * 255),
        a
      );
      this.debugGraphics.lineBetween(x1, y1, x2, y2);
    }
  }

  public Reset() {
    this.debugKey?.off('down', this.toggleDebug, this);
    this.debugKey = null;
    this.debugEnabled = false;
    this.debugGraphics?.destroy();
    this.debugGraphics = null;
    this.debugHintText?.destroy();
    this.debugHintText = null;
    this.scene = null;
  }

  private toggleDebug(): void {
    this.debugEnabled = !this.debugEnabled;
  }
}

