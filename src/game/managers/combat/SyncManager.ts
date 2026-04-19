import RAPIER from "@dimforge/rapier2d-deterministic-compat";
import { FrameInterval } from "../../../../public/constants";
import { EventBus } from "../../../utils/eventBus";
import BackendWS from "../../../utils/net/sync";
import type { Game } from "../../scenes/Game";
import QueueReceive from "../../sync/queue_receive";
import QueueSend from "../../sync/queue_send";
import { BaseManager } from "../BaseManager";
import PlantsManager from "./PlantsManager";
import { PlayerIdentify } from "./ResourceManager";

type SyncManagerEvent = {
  onRequestPlant: (playerId: PlayerIdentify, pid: number, level: number, col: number, row: number) => void;
  onRequestUseStarShards: (playerId: PlayerIdentify, pid: number, col: number, row: number) => void;
  onRequestRemovePlant: (pid: number, col: number, row: number) => void;
};

export default class SyncManager extends BaseManager {
  private static _instance: SyncManager;
  protected scene: Game | null = null;

  Eventbus: EventBus<SyncManagerEvent>;
  private frameSnapshots: Map<number, Uint8Array> = new Map<number, Uint8Array>();
  private queueBound: boolean = false;
  private readonly snapshotRetainFrames: number = 120;

  public FrameInterval: number = FrameInterval;

  sendQueue!: QueueSend;
  recvQueue!: QueueReceive;

  constructor() {
    super();
    this.Eventbus = new EventBus<SyncManagerEvent>();
  }

  public static get Instance(): SyncManager {
    if (!this._instance) {
      this._instance = new SyncManager();
    }
    return this._instance;
  }

  public Load(): void {
    this.recvQueue = new QueueReceive();
    this.sendQueue = new QueueSend();
    BackendWS.setQueue(this.recvQueue, this.sendQueue);
    this.bindQueueAndPlantEvents();
  }

  private bindQueueAndPlantEvents() {
    if (this.queueBound) {
      return;
    }
    this.queueBound = true;

    PlantsManager.Instance.EventBus.on("onDeterminePlant", this.handleDeterminePlant);
    PlantsManager.Instance.EventBus.on("onDetermineUseStarShards", this.handleDetermineUseStarShards);
    PlantsManager.Instance.EventBus.on("onDetermineRemovePlant", this.handleDetermineRemovePlant);

    this.recvQueue.InGameEventBus.on("onCardPlant", this.handleRecvCardPlant);
    this.recvQueue.InGameEventBus.on("onUseStarShards", this.handleRecvUseStarShards);
    this.recvQueue.InGameEventBus.on("onRemovePlant", this.handleRecvRemovePlant);
  }

  private unbindQueueAndPlantEvents() {
    if (!this.queueBound) {
      return;
    }
    this.queueBound = false;

    PlantsManager.Instance.EventBus.off("onDeterminePlant", this.handleDeterminePlant);
    PlantsManager.Instance.EventBus.off("onDetermineUseStarShards", this.handleDetermineUseStarShards);
    PlantsManager.Instance.EventBus.off("onDetermineRemovePlant", this.handleDetermineRemovePlant);

    this.recvQueue?.InGameEventBus.off("onCardPlant", this.handleRecvCardPlant);
    this.recvQueue?.InGameEventBus.off("onUseStarShards", this.handleRecvUseStarShards);
    this.recvQueue?.InGameEventBus.off("onRemovePlant", this.handleRecvRemovePlant);
  }

  private handleDeterminePlant = (pid: number, level: number, col: number, row: number, cost: number) => {
    this.sendQueue.sendCardPlant(pid, col, row, level, cost);
  };

  private handleDetermineUseStarShards = (pid: number, col: number, row: number, cost: number) => {
    this.sendQueue.sendStarShards(pid, col, row, cost);
  };

  private handleDetermineRemovePlant = (pid: number, col: number, row: number) => {
    this.sendQueue.sendRemovePlant(pid, col, row);
  };

  private handleRecvCardPlant = (pid: number, col: number, row: number, level: number, uid: number) => {
    this.Eventbus.emit("onRequestPlant", uid, pid, level, col, row);
  };

  private handleRecvUseStarShards = (pid: number, col: number, row: number, uid: number) => {
    this.Eventbus.emit("onRequestUseStarShards", uid, pid, col, row);
  };

  private handleRecvRemovePlant = (pid: number, col: number, row: number) => {
    this.Eventbus.emit("onRequestRemovePlant", pid, col, row);
  };

  public update(): boolean {
    const frameReady = this.recvQueue.Consume();
    if (this.scene?.waitText) {
      this.scene.waitText.setVisible(BackendWS.isRoomSessionMode() && !frameReady);
    }
    return frameReady;
  }

  public GetFrameID() {
    return this.recvQueue?.currentFrameId ?? 0;
  }

  public GetNextFrameID() {
    return this.GetFrameID() + 1;
  }

  public BacktrackToFrame(frameId: number) {
    const snapshot = this.frameSnapshots.get(frameId);
    if (!this.scene || !snapshot) {
      console.warn("Backtrack failed. Missing scene or snapshot for frame:", frameId);
      return;
    }

    const world = RAPIER.World.restoreSnapshot(snapshot);
    this.scene.rapierWorld = world;

    const currentFrameId = this.GetFrameID();
    for (let replayFrameId = frameId + 1; replayFrameId <= currentFrameId; replayFrameId++) {
      const operations = this.recvQueue.backupOperations.get(replayFrameId) || [];
      for (const operation of operations) {
        this.recvQueue.ConsumeInGameOperation(operation);
      }
    }
  }

  public DumpFrame(frameId: number) {
    const rapierSnapshot = this.scene?.rapierWorld.takeSnapshot();
    if (!rapierSnapshot) {
      return;
    }

    this.frameSnapshots.set(frameId, rapierSnapshot);

    const lastAckFrameId = this.recvQueue.lastAckFrameId;
    for (const snapshotFrameId of this.frameSnapshots.keys()) {
      const outOfAckWindow = snapshotFrameId < lastAckFrameId;
      const outOfHistoryWindow = snapshotFrameId < frameId - this.snapshotRetainFrames;
      if (outOfAckWindow || outOfHistoryWindow) {
        this.frameSnapshots.delete(snapshotFrameId);
      }
    }
  }

  public Reset() {
    this.unbindQueueAndPlantEvents();
    this.scene = null;
    if (this.recvQueue) {
      this.recvQueue.Reset();
    }
    if (this.sendQueue) {
      this.sendQueue.Reset();
    }
    this.frameSnapshots.clear();
    BackendWS.disconnectQueues();
  }
}
