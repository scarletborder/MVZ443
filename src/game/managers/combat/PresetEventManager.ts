import { BaseManager } from "../BaseManager";
import MobManager from "./MobManager";

/**
 * 预设事件管理器
 * 负责预设事件的加载、管理和重置
 */
export class PresetEventManager extends BaseManager {
  private static _instance: PresetEventManager;
  private onNewWaveHandler: ((waveId: number, isFlag: boolean) => void) | null = null;

  public static get Instance(): PresetEventManager {
    if (!this._instance) {
      this._instance = new PresetEventManager();
    }
    return this._instance;
  }
  /**
   * 加载预设事件
   */
  public Load(): void {
    // 监听 MobManager 的 onNewWave 事件
    this.onNewWaveHandler = (waveId: number, isFlag: boolean) => {
      if (waveId === 0) {
        this.triggerCombatStartEvent();
      } else {
        this.triggerSpecifiedWaveEvent(waveId, isFlag);
      }
    };
    MobManager.Instance.EventBus.on('onNewWave', this.onNewWaveHandler);
  }

  /**
   * 游戏开始时触发 (waveId = 0)
   */
  private triggerCombatStartEvent(): void {
    console.log('Combat start event triggered at wave 0');
    // TODO: 实现游戏开始时的预设事件处理逻辑
  }

  /**
   * 特定波数触发的事件
   */
  private triggerSpecifiedWaveEvent(waveId: number, isFlag: boolean): void {
    console.log(`Specified wave event triggered at wave ${waveId}, isFlag: ${isFlag}`);
    // TODO: 实现特定波数的预设事件处理逻辑
  }

  /**
   * 重置预设事件状态
   */
  public Reset(): void {
    // 移除事件监听
    if (this.onNewWaveHandler) {
      MobManager.Instance.EventBus.off('onNewWave', this.onNewWaveHandler);
      this.onNewWaveHandler = null;
    }
  }
}
