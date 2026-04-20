import { BaseManager } from "../BaseManager";
import type { Game } from "../../scenes/Game";
import { PhaserEventBus, PhaserEvents } from "../../EventBus";
import BackendWS from "../../../utils/net/sync";
import CardpileManager from "./CardpileManager";

/**
 * 键盘绑定管理器
 * 管理游戏中的键盘快捷键绑定
 */
export default class KeybindManager extends BaseManager {
  private static _instance: KeybindManager;
  protected scene: Game | null = null;

  static defaultKeyMap: Record<string, number> = {
    'pause': Phaser.Input.Keyboard.KeyCodes.ESC,
    'pickaxe': Phaser.Input.Keyboard.KeyCodes.Q,
    'starshards': Phaser.Input.Keyboard.KeyCodes.W,
    'timescale': Phaser.Input.Keyboard.KeyCodes.T,
  };

  public KeyMap: Record<string, number> = { ...KeybindManager.defaultKeyMap };

  constructor() {
    super();
  }

  public static get Instance(): KeybindManager {
    if (!this._instance) {
      this._instance = new KeybindManager();
    }
    return this._instance;
  }


  public Load(): void {
    if (!this.scene) {
      console.error("KeybindManager: Scene is not set. Cannot load key bindings.");
      return;
    }
    for (const action in this.KeyMap) {
      const addedNewKey = this.scene?.input.keyboard?.addKey(this.KeyMap[action]);
      if (!addedNewKey) {
        console.error(`KeybindManager: Failed to add key for action "${action}". Key code: ${this.KeyMap[action]}`);
      }
      addedNewKey?.on('down', () => {
        switch (action) {
          case 'pause':
            this.handlePause();
            break;
          case 'pickaxe':
            this.handlePickaxe();
            break;
          case 'starshards':
            this.handleStarshards();
            break;
          case 'timescale':
            this.handleTimescale();
            break;
        }
      });
    }
  }

  public Reset(): void {
    this.scene = null;
    this.KeyMap = { ...KeybindManager.defaultKeyMap };
  }

  public setScene(scene: Game): void {
    this.scene = scene;
  }

  private handlePause(): void {
    if (BackendWS.isOnlineMode()) {
      return;
    }
    PhaserEventBus.emit(PhaserEvents.TogglePause);
  }

  private handlePickaxe(): void {
    CardpileManager.Instance.ClickPickaxe();
  }

  private handleStarshards(): void {
    CardpileManager.Instance.ClickStarShards();
  }

  private handleTimescale(): void {
    if (BackendWS.isOnlineMode()) {
      return;
    }
    PhaserEventBus.emit(PhaserEvents.TimespeedToggle);
  }
}
