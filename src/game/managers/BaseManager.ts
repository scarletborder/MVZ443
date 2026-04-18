import { Game } from "../scenes/Game";

/**
 * 管理器基类
 * 提供单例模式、场景管理和重置等通用功能
 */
export abstract class BaseManager {
  protected scene: Game | null = null;

  /**
   * 设置场景
   * @param scene 游戏场景实例
   */
  public setScene(scene: Game): void {
    this.scene = scene;
  }

  // 新游戏开始时加载
  public abstract Load(): void;

  /**
   * 重置管理器状态
   */
  public abstract Reset(): void;
}
