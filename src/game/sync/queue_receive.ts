import Denque from "denque";
import {
  InGameOperation,
  InGameResponse
} from "../../pb/response";
import { EventBus } from "../../utils/eventBus";
import BackendWS from "../../utils/net/sync";

type InGameEvent = {
  onCardPlant: (pid: number, col: number, row: number, level: number, uid: number) => void;
  onRemovePlant: (pid: number, col: number, row: number) => void;
  onUseStarShards: (pid: number, col: number, row: number, uid: number) => void;
  onGameEvent: (eventType: number, message: string) => void;
  onError: (message: string) => void;
};

export default class QueueReceive {
  private readonly backupRetainFrames: number = 120;
  InGameEventBus: EventBus<InGameEvent>;
  queues: Denque<InGameResponse>;

  currentFrameId: number = 0;
  lastAckFrameId: number = 0;

  consumedResponseFrames: Set<number> = new Set<number>();
  bufferedResponses: Map<number, InGameResponse> = new Map<number, InGameResponse>();

  constructor() {
    this.queues = new Denque();
    this.InGameEventBus = new EventBus<InGameEvent>();
  }

  Reset() {
    this.queues.clear();
    this.bufferedResponses.clear();
    this.currentFrameId = 0;
    this.lastAckFrameId = 0;
    this.consumedResponseFrames.clear();
  }

  handleInGameResponse(response: InGameResponse) {
    console.log("[QueueReceive] enqueue response", {
      frameId: response.frameId,
      operationCount: response.operations.length,
      queueLengthBefore: this.queues.length,
      bufferedCount: this.bufferedResponses.size,
      currentFrameId: this.currentFrameId,
      lastAckFrameId: this.lastAckFrameId
    });
    this.queues.push(response);
  }

  public ConsumeInGameOperation(operation: InGameOperation): void {
    switch (operation.payload.oneofKind) {
      case "cardPlant": {
        const cardPlant = operation.payload.cardPlant;
        if (cardPlant.base) {
          this.InGameEventBus.emit(
            "onCardPlant",
            cardPlant.pid,
            cardPlant.base.col,
            cardPlant.base.row,
            cardPlant.level,
            cardPlant.base.uid
          );
          return;
        }
        break;
      }
      case "removePlant": {
        const removePlant = operation.payload.removePlant;
        if (removePlant.base) {
          this.InGameEventBus.emit("onRemovePlant", removePlant.pid, removePlant.base.col, removePlant.base.row);
          return;
        }
        break;
      }
      case "useStarShards": {
        const useStarShards = operation.payload.useStarShards;
        if (useStarShards.base) {
          this.InGameEventBus.emit(
            "onUseStarShards",
            useStarShards.pid,
            useStarShards.base.col,
            useStarShards.base.row,
            useStarShards.base.uid
          );
          return;
        }
        break;
      }
      case "gameEvent": {
        const gameEvent = operation.payload.gameEvent;
        if (gameEvent) {
          if (gameEvent.eventType === 0x4000) {
            return;
          }
          this.InGameEventBus.emit("onGameEvent", gameEvent.eventType, gameEvent.message);
          return;
        }
        break;
      }
      case "error": {
        const error = operation.payload.error;
        if (error) {
          this.InGameEventBus.emit("onError", error.message);
          console.error("Game error:", error.message);
          return;
        }
        break;
      }
      default:
        console.warn("Unknown game operation type:", operation.payload.oneofKind);
        return;
    }
    console.warn("No operation function defined for:", operation.payload.oneofKind);
  }

  Consume(): boolean {
    while (!this.queues.isEmpty()) {
      const response = this.queues.shift();
      if (!response) {
        continue;
      }
      if (response.frameId <= this.lastAckFrameId || this.consumedResponseFrames.has(response.frameId)) {
        console.log("[QueueReceive] drop stale response", {
          frameId: response.frameId,
          lastAckFrameId: this.lastAckFrameId,
          alreadyConsumed: this.consumedResponseFrames.has(response.frameId)
        });
        continue;
      }
      this.bufferedResponses.set(response.frameId, response);
    }

    const nextFrameID = this.currentFrameId + 1;
    const response = this.bufferedResponses.get(nextFrameID);
    if (!response) {
      console.log("[QueueReceive] waiting for next frame", {
        nextFrameID,
        currentFrameId: this.currentFrameId,
        lastAckFrameId: this.lastAckFrameId,
        bufferedFrameIds: [...this.bufferedResponses.keys()].slice(0, 10)
      });
      return false;
    }

    this.bufferedResponses.delete(nextFrameID);
    this.consumedResponseFrames.add(nextFrameID);

    const operations = [...response.operations].sort((a, b) => {
      if (a.processFrameId !== b.processFrameId) {
        return a.processFrameId - b.processFrameId;
      }
      return a.operationIndex - b.operationIndex;
    });

    for (const operation of operations) {
      if (operation.processFrameId !== nextFrameID) {
        console.warn(
          "Lockstep response contains mismatched processFrameId:",
          operation.processFrameId,
          "expected:",
          nextFrameID
        );
      }
      this.ConsumeInGameOperation(operation);
    }

    this.currentFrameId = nextFrameID;
    this.lastAckFrameId = nextFrameID;
    console.log("[QueueReceive] consumed frame", {
      frameId: nextFrameID,
      operationCount: operations.length,
      bufferedRemaining: this.bufferedResponses.size
    });
    BackendWS.sendBlankFrame(nextFrameID);
    return true;
  }
}
