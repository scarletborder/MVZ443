export interface IMonsterAnimController {
  // 基础更新
  updatePosition(x: number, y: number): void;
  setDepth(depth: number): void;

  // 视觉特效
  highlight(): void;
  twinkle?(): void;

  // 动作控制
  startLegSwing(): void;
  stopLegSwing(): void;
  startArmSwing(): void;
  stopArmSwing(): void;

  // 销毁
  destroy(): void;

  // 特殊状态 (如石巨人正在播放不可打断的动画)
  isInAnim?: boolean;
}