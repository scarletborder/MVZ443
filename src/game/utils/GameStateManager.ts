/**
 * 游戏状态管理器
 * 提供Phaser游戏逻辑同步访问React状态的方法
 */
export class GameStateManager {
  private static instance: GameStateManager;

  // 当前状态
  private currentEnergy: number = 100;
  private currentStarShards: number = 0;

  // 状态更新回调
  private energyUpdateCallbacks: ((energy: number) => void)[] = [];
  private starShardsUpdateCallbacks: ((starShards: number) => void)[] = [];

  private constructor() { }

  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  /**
   * 同步获取当前能量值
   */
  public getCurrentEnergy(): number {
    return this.currentEnergy;
  }

  /**
   * 同步获取当前星之碎片数量
   */
  public getCurrentStarShards(): number {
    return this.currentStarShards;
  }

  /**
   * 更新能量值（由React组件调用）
   */
  public updateEnergy(energy: number): void {
    this.currentEnergy = energy;
    // 通知所有监听器
    this.energyUpdateCallbacks.forEach(callback => callback(energy));
  }

  /**
   * 更新星之碎片数量（由React组件调用）
   */
  public updateStarShards(starShards: number): void {
    this.currentStarShards = starShards;
    // 通知所有监听器
    this.starShardsUpdateCallbacks.forEach(callback => callback(starShards));
  }

  /**
   * 注册能量更新监听器
   */
  public onEnergyUpdate(callback: (energy: number) => void): void {
    this.energyUpdateCallbacks.push(callback);
  }

  /**
   * 注册星之碎片更新监听器
   */
  public onStarShardsUpdate(callback: (starShards: number) => void): void {
    this.starShardsUpdateCallbacks.push(callback);
  }

  /**
   * 移除能量更新监听器
   */
  public removeEnergyUpdateListener(callback: (energy: number) => void): void {
    const index = this.energyUpdateCallbacks.indexOf(callback);
    if (index > -1) {
      this.energyUpdateCallbacks.splice(index, 1);
    }
  }

  /**
   * 移除星之碎片更新监听器
   */
  public removeStarShardsUpdateListener(callback: (starShards: number) => void): void {
    const index = this.starShardsUpdateCallbacks.indexOf(callback);
    if (index > -1) {
      this.starShardsUpdateCallbacks.splice(index, 1);
    }
  }
}

// 导出单例实例
export const gameStateManager = GameStateManager.getInstance(); 