
import { Game } from "../../scenes/Game";
import { BaseManager } from "../BaseManager";

export default class DebugManager extends BaseManager {
  private static _instance: DebugManager;
  protected scene: Game | null = null;

  constructor() {
    super();
  }
  public Load(): void { }
  public setScene(scene: Game) {
    this.scene = scene;
  }

  public static get Instance(): DebugManager {
    if (!this._instance) {
      this._instance = new DebugManager();
    }
    return this._instance;
  }

  public Reset() {
    this.scene = null;
  }
}
