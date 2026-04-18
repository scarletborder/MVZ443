import { Game } from "../../scenes/Game";
import { PhaserEventBus } from "../../EventBus";
import QueueReceive from "../../sync/queue_receive";
import QueueSend from "../../sync/queue_send";
import { BaseManager } from "../BaseManager";
import { PlayerIdentify } from "./ResourceManager";
import PlantsManager from "./PlantsManager";
import { EventBus } from "../../../utils/eventBus";
import { FrameInterval } from "../../../../public/constants";

// 仅游戏内使用功能的SyncManager
// 依赖外部的全局实例

type SyncManagerEvent = {
  // 接受到的事件，之后要在plantsManager监听
  onRequestPlant: (playerId: PlayerIdentify, pid: number, level: number, col: number, row: number) => void;
  onRequestUseStarShards: (playerId: PlayerIdentify, pid: number, col: number, row: number) => void;
  onRequestRemovePlant: (pid: number, col: number, row: number) => void;
}

export default class SyncManager extends BaseManager {
  private static _instance: SyncManager;
  protected scene: Game | null = null;

  Eventbus: EventBus<SyncManagerEvent>;

  // 游戏内同步
  public FrameInterval: number = FrameInterval; // 每100ms一个服务器帧

  // 依赖外部
  sendQueue: QueueSend
  recvQueue: QueueReceive

  constructor() {
    super();
  }
  public Load(): void {
    // 监听plantManager的事件，发送给服务器
    PlantsManager.Instance.EventBus.on('onDeterminePlant', this.handleDeterminePlant);
    PlantsManager.Instance.EventBus.on('onDetermineUseStarShards', this.handleDetermineUseStarShards);
    PlantsManager.Instance.EventBus.on('onDetermineRemovePlant', this.handleDetermineRemovePlant);

    // 监听recvQueue的事件，更新游戏状态
    this.recvQueue.InGameEventBus.on('onCardPlant', (playerId, pid, level, col, row) => {
      this.Eventbus.emit('onRequestPlant', playerId, pid, level, col, row);
    });
    this.recvQueue.InGameEventBus.on('onUseStarShards', (pid, col, row, uid) => {
      this.Eventbus.emit('onRequestUseStarShards', uid, pid, col, row);
    });
    this.recvQueue.InGameEventBus.on('onRemovePlant', (pid, col, row) => {
      this.Eventbus.emit('onRequestRemovePlant', pid, col, row);
    });
  }

  public static get Instance(): SyncManager {
    if (!this._instance) {
      this._instance = new SyncManager();
    }
    return this._instance;
  }

  private handleDeterminePlant(pid: number, level: number, col: number, row: number) {
    this.sendQueue.sendCardPlant(pid, col, row, level);
  }

  private handleDetermineUseStarShards(pid: number, col: number, row: number) {
    this.sendQueue.sendStarShards(pid, col, row);
  }

  private handleDetermineRemovePlant(pid: number, col: number, row: number) {
    this.sendQueue.sendRemovePlant(pid, col, row);
  }

  public update() {
    this.recvQueue.Consume();
  }

  // 回溯到指定帧
  public BacktrackToFrame(frameId: number) {
    // TODO: 实现回溯逻辑

    // 从recvQueue取出缓存的帧，进行重放
  }

  public Reset() {
    this.scene = null;
  }

}
