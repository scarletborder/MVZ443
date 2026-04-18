import { FrameInterval } from "../../../public/constants";

/**
 * 帧时间差值估算器
 * 用于维护最近两帧接收时间差值，计算与服务器之间的帧差值
 */
export class FrameDeltaEstimator {
  private lastFrameReceiveTime: number = 0; // 上一帧接收时间
  private currentFrameReceiveTime: number = 0; // 当前帧接收时间
  private frameTimeDelta: number = FrameInterval; // 最近两帧接收时间差值，默认为FrameTick

  /**
   * 更新帧接收时间
   */
  public updateFrameReceiveTime(): void {
    const currentTime = Date.now();
    this.lastFrameReceiveTime = this.currentFrameReceiveTime;
    this.currentFrameReceiveTime = currentTime;

    // 计算时间差值（仅在有上一帧时间时）
    if (this.lastFrameReceiveTime > 0) {
      this.frameTimeDelta = this.currentFrameReceiveTime - this.lastFrameReceiveTime;
    }
  }

  /**
   * 获取最近两帧的时间差值
   */
  public getFrameTimeDelta(): number {
    return this.frameTimeDelta;
  }

  /**
   * 计算与服务器的帧差值
   * 基于逻辑帧间隔（FrameTick）计算
   */
  public calculateServerFrameDiff(): number {
    return Math.ceil(this.frameTimeDelta / FrameInterval);
  }

  /**
   * 重置帧时间相关数据
   */
  public reset(): void {
    this.lastFrameReceiveTime = 0;
    this.currentFrameReceiveTime = 0;
    this.frameTimeDelta = FrameInterval;
  }
}
