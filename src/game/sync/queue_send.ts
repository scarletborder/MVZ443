import Denque from "denque";
import {
  Request,
  RequestBlank,
  RequestCardPlant,
  RequestEndGame,
  RequestGridOperation,
  RequestRemovePlant,
  RequestStarShards
} from "../../pb/request";
import { ResponseGridOperation } from "../../pb/response";
import BackendWS from "../../utils/net/sync";
import ResourceManager from "../managers/combat/ResourceManager";

export default class QueueSend {
  queues: Denque<Request>;
  pendingFrames: Map<number, Map<string, Request>>;
  public operationCount: number = 1;
  private readonly commandDelayFrames: number = 2;
  private readonly resendIntervalMs: number = 50;
  private lastTransmitAt: number = 0;

  constructor() {
    this.queues = new Denque();
    this.pendingFrames = new Map<number, Map<string, Request>>();
  }

  Reset() {
    this.queues.clear();
    this.pendingFrames.clear();
    this.operationCount = 1;
    this.lastTransmitAt = 0;
  }

  Consume() {
    if (!BackendWS.isRoomSessionMode()) {
      return;
    }

    let hasFreshRequests = false;
    while (!this.queues.isEmpty()) {
      const request = this.queues.shift();
      if (!request) {
        continue;
      }
      this.registerPendingRequest(request);
      hasFreshRequests = true;
    }

    this.pruneAckedFrames();
    if (this.pendingFrames.size === 0) {
      return;
    }

    const now = Date.now();
    if (!hasFreshRequests && now - this.lastTransmitAt < this.resendIntervalMs) {
      return;
    }

    const sortedFrames = [...this.pendingFrames.keys()].sort((a, b) => a - b);
    for (const frameId of sortedFrames) {
      const frameRequests = this.pendingFrames.get(frameId);
      if (!frameRequests) {
        continue;
      }
      for (const request of frameRequests.values()) {
        BackendWS.send(Request.toBinary(this.refreshAckFrameId(request)));
      }
    }
    this.lastTransmitAt = now;
  }

  _extractBase(base?: RequestGridOperation): ResponseGridOperation | undefined {
    if (!base) {
      return undefined;
    }
    return {
      uid: BackendWS.my_id,
      col: base.col,
      row: base.row
    };
  }

  public sendGameEnd(result: number) {
    const request: RequestEndGame = {
      gameResult: result
    };
    this.queues.push({
      payload: {
        endGame: request,
        oneofKind: "endGame"
      }
    });
  }

  private createOperationBase(col: number, row: number): RequestGridOperation {
    return {
      base: {
        frameId: BackendWS.GetFrameID(),
        ackFrameId: BackendWS.AckFrameID
      },
      col,
      row,
      // Match deterministic-lockstep-demo: schedule local input
      // to a fixed future frame instead of estimating server drift.
      processFrameId: BackendWS.GetFrameID() + this.commandDelayFrames
    };
  }

  public sendCardPlant(pid: number, col: number, row: number, level: number, cost: number) {
    const base = this.createOperationBase(col, row);

    const request: RequestCardPlant = {
      base,
      pid,
      level,
      cost,
      energySum: ResourceManager.Instance.getEnergy('mine'),
      starShardsSum: ResourceManager.Instance.getStarShards('mine'),
    };
    this.queues.push({
      payload: {
        plant: request,
        oneofKind: "plant"
      }
    });
  }

  public sendRemovePlant(pid: number, col: number, row: number) {
    const base = this.createOperationBase(col, row);

    const request: RequestRemovePlant = {
      base,
      pid
    };
    this.queues.push({
      payload: {
        removePlant: request,
        oneofKind: "removePlant"
      }
    });
  }

  public sendStarShards(pid: number, col: number, row: number, cost: number) {
    const base = this.createOperationBase(col, row);

    const currentStarShards = ResourceManager.Instance.getStarShards('mine');

    const request: RequestStarShards = {
      base,
      pid,
      cost,
      energySum: ResourceManager.Instance.getEnergy('mine'),
      starShardsSum: currentStarShards
    };
    this.queues.push({
      payload: {
        starShards: request,
        oneofKind: "starShards"
      }
    });
  }

  public sendBlankFrame(frameId: number) {
    const request: RequestBlank = {
      frameId,
      ackFrameId: BackendWS.AckFrameID
    };
    this.queues.push({
      payload: {
        blank: request,
        oneofKind: "blank"
      }
    });
  }

  private registerPendingRequest(request: Request) {
    const frameId = this.getRequestFrameId(request);
    if (frameId === undefined) {
      return;
    }
    let frameRequests = this.pendingFrames.get(frameId);
    if (!frameRequests) {
      frameRequests = new Map<string, Request>();
      this.pendingFrames.set(frameId, frameRequests);
    }

    const signature = this.getRequestSignature(request);
    if (request.payload.oneofKind === "blank") {
      if (frameRequests.size === 0) {
        frameRequests.set(signature, request);
      }
      return;
    }

    frameRequests.delete(`blank:${frameId}`);
    frameRequests.set(signature, request);
  }

  private pruneAckedFrames() {
    const ackFrameId = BackendWS.AckFrameID;
    for (const frameId of this.pendingFrames.keys()) {
      if (frameId <= ackFrameId) {
        this.pendingFrames.delete(frameId);
      }
    }
  }

  private getRequestFrameId(request: Request): number | undefined {
    switch (request.payload.oneofKind) {
      case "blank":
        return request.payload.blank.frameId;
      case "plant":
        return request.payload.plant.base?.processFrameId;
      case "removePlant":
        return request.payload.removePlant.base?.processFrameId;
      case "starShards":
        return request.payload.starShards.base?.processFrameId;
      default:
        return undefined;
    }
  }

  private getRequestSignature(request: Request): string {
    switch (request.payload.oneofKind) {
      case "blank":
        return `blank:${request.payload.blank.frameId}`;
      case "plant":
        return [
          "plant",
          request.payload.plant.base?.processFrameId,
          request.payload.plant.pid,
          request.payload.plant.level,
          request.payload.plant.base?.col,
          request.payload.plant.base?.row
        ].join(":");
      case "removePlant":
        return [
          "removePlant",
          request.payload.removePlant.base?.processFrameId,
          request.payload.removePlant.pid,
          request.payload.removePlant.base?.col,
          request.payload.removePlant.base?.row
        ].join(":");
      case "starShards":
        return [
          "starShards",
          request.payload.starShards.base?.processFrameId,
          request.payload.starShards.pid,
          request.payload.starShards.base?.col,
          request.payload.starShards.base?.row
        ].join(":");
      default:
        return request.payload.oneofKind ?? "unknown";
    }
  }

  private refreshAckFrameId(request: Request): Request {
    switch (request.payload.oneofKind) {
      case "blank":
        request.payload.blank.ackFrameId = BackendWS.AckFrameID;
        break;
      case "plant":
        if (request.payload.plant.base?.base) {
          request.payload.plant.base.base.ackFrameId = BackendWS.AckFrameID;
        }
        break;
      case "removePlant":
        if (request.payload.removePlant.base?.base) {
          request.payload.removePlant.base.base.ackFrameId = BackendWS.AckFrameID;
        }
        break;
      case "starShards":
        if (request.payload.starShards.base?.base) {
          request.payload.starShards.base.base.ackFrameId = BackendWS.AckFrameID;
        }
        break;
      default:
        break;
    }
    return request;
  }
}

