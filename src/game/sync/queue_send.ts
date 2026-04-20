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
import BackendWS from "../../utils/net/sync";
import ResourceManager from "../managers/combat/ResourceManager";
import { CommandLeadFrames, FrameInterval } from "../../../public/constants";

export default class QueueSend {
  queues: Denque<Request>;
  private readonly commandDelayFrames: number = CommandLeadFrames;
  private readonly blankPollIntervalMs: number = FrameInterval;
  private lastBlankAckFrameIdSent: number = -1;
  private lastBlankAckFrameIdQueued: number = -1;
  private lastBlankSentAt: number = 0;
  private lastBlankQueuedAt: number = 0;

  constructor() {
    this.queues = new Denque();
  }

  Reset() {
    this.queues.clear();
    this.lastBlankAckFrameIdSent = -1;
    this.lastBlankAckFrameIdQueued = -1;
    this.lastBlankSentAt = 0;
    this.lastBlankQueuedAt = 0;
  }

  Consume() {
    if (!BackendWS.isRoomSessionMode()) {
      return;
    }
    while (!this.queues.isEmpty()) {
      const request = this.queues.shift();
      if (request) {
        const refreshedRequest = this.refreshAckFrameId(request);
        console.log("[QueueSend] send request", {
          type: refreshedRequest.payload.oneofKind,
          ackFrameId: refreshedRequest.payload.oneofKind === "blank"
            ? refreshedRequest.payload.blank.ackFrameId
            : BackendWS.AckFrameID,
          currentFrameId: BackendWS.GetFrameID(),
          queueLengthAfterShift: this.queues.length
        });
        if (refreshedRequest.payload.oneofKind === "blank") {
          this.lastBlankAckFrameIdQueued = -1;
          this.lastBlankAckFrameIdSent = refreshedRequest.payload.blank.ackFrameId;
          this.lastBlankQueuedAt = 0;
          this.lastBlankSentAt = Date.now();
        }
        BackendWS.send(Request.toBinary(refreshedRequest));
      }
    }
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
    const now = Date.now();
    const request: RequestBlank = {
      frameId,
      ackFrameId: BackendWS.AckFrameID
    };
    console.log("[QueueSend] queue blank frame", {
      frameId,
      ackFrameId: request.ackFrameId,
      lastBlankAckFrameIdSent: this.lastBlankAckFrameIdSent,
      lastBlankAckFrameIdQueued: this.lastBlankAckFrameIdQueued
    });
    this.queues.push({
      payload: {
        blank: request,
        oneofKind: "blank"
      }
    });
    this.lastBlankAckFrameIdQueued = request.ackFrameId;
    this.lastBlankQueuedAt = now;
  }

  public ensureBlankFrame(frameId: number) {
    const now = Date.now();
    const ackFrameId = BackendWS.AckFrameID;
    const hasQueuedSameAck = ackFrameId === this.lastBlankAckFrameIdQueued;
    const hasSentSameAckRecently = ackFrameId === this.lastBlankAckFrameIdSent
      && now - this.lastBlankSentAt < this.blankPollIntervalMs;
    const hasQueuedSameAckRecently = hasQueuedSameAck
      && now - this.lastBlankQueuedAt < this.blankPollIntervalMs;

    if (hasSentSameAckRecently || hasQueuedSameAckRecently) {
      console.log("[QueueSend] skip duplicate blank", {
        frameId,
        ackFrameId,
        lastBlankAckFrameIdSent: this.lastBlankAckFrameIdSent,
        lastBlankAckFrameIdQueued: this.lastBlankAckFrameIdQueued,
        msSinceLastBlankSent: now - this.lastBlankSentAt,
        msSinceLastBlankQueued: now - this.lastBlankQueuedAt
      });
      return;
    }
    console.log("[QueueSend] ensure blank frame", {
      frameId,
      ackFrameId
    });
    this.sendBlankFrame(frameId);
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
