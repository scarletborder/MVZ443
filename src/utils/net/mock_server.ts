import {
  Request,
  RequestCardPlant,
  RequestGridOperation,
  RequestRemovePlant,
  RequestStarShards
} from "../../pb/request";
import {
  InGameOperation,
  InGameResponse,
  RoomResponse
} from "../../pb/response";

export type MockPacketChannel = "lobby" | "room" | "ingame";

export interface MockPacket {
  channel: MockPacketChannel;
  data: Uint8Array;
}

interface ClientSession {
  id: number;
  ackFrameId: number;
  lastSeenAt: number;
  highestSubmittedFrame: number;
  isReady: boolean;
  isLoaded: boolean;
}

interface FrameSubmission {
  operations: InGameOperation[];
  operationSignatures: Set<string>;
}

const inGameOperationTypePriority: Record<string, number> = {
  removePlant: 0,
  useStarShards: 1,
  cardPlant: 2,
  gameEvent: 3,
  error: 4
};

class MockServer {
  private readonly clientTimeoutMs: number = 15000;
  private readonly maxResendPerPull: number = 32;
  private readonly maxHistoryFrames: number = 600;
  private readonly estimatedLeadFrames: number = 8;
  private readonly baseDeltaFrames: number = 2;

  private isRunning: boolean = false;
  private roomId: number = 1;
  private myId: number = 1;
  private lordId: number = 1;
  private seed: number = 1;
  private serverFrameId: number = 0;
  private operationSerial: number = 0;
  private gameStartedAt: number = 0;

  private clients: Map<number, ClientSession> = new Map<number, ClientSession>();
  private scheduledFrames: Map<number, FrameSubmission> = new Map<number, FrameSubmission>();
  private frameHistory: Map<number, InGameResponse> = new Map<number, InGameResponse>();

  private trace(message: string, details?: unknown) {
    if (details !== undefined) {
      console.log(`[MockServer] ${message}`, details);
      return;
    }
    console.log(`[MockServer] ${message}`);
  }

  startSingleRoom(): MockPacket[] {
    const now = Date.now();
    this.isRunning = true;
    this.seed = Math.floor(Math.random() * 2147483647);
    this.serverFrameId = 0;
    this.operationSerial = 0;
    this.gameStartedAt = 0;
    this.clients.clear();
    this.scheduledFrames.clear();
    this.frameHistory.clear();
    this.ensureClient(this.myId, now);
    this.trace("startSingleRoom", {
      roomId: this.roomId,
      myId: this.myId,
      seed: this.seed
    });

    return [
      {
        channel: "room",
        data: RoomResponse.toBinary({
          payload: {
            oneofKind: "roomInfo",
            roomInfo: {
              roomId: this.roomId,
              lordId: this.lordId,
              myId: this.myId,
              peers: JSON.stringify([{ id: this.myId, addr: "local-mock" }])
            }
          }
        })
      }
    ];
  }

  stop() {
    this.isRunning = false;
    this.gameStartedAt = 0;
    this.clients.clear();
    this.scheduledFrames.clear();
    this.frameHistory.clear();
  }

  isActive(): boolean {
    return this.isRunning;
  }

  handleMessage(message: Uint8Array): MockPacket[] {
    if (!this.isRunning) {
      return [];
    }

    try {
      const now = Date.now();
      this.cleanupTimedOutClients(now);

      const request = Request.fromBinary(message);
      this.trace("handleMessage", {
        type: request.payload.oneofKind
      });
      switch (request.payload.oneofKind) {
        case "chooseMap":
          return [this.makeChooseMapPacket(request.payload.chooseMap.chapterId, request.payload.chooseMap.stageId)];
        case "leaveChooseMap":
          return [this.makeQuitChooseMapPacket()];
        case "ready":
          return this.handleReadyRequest(this.myId, request.payload.ready.isReady, now);
        case "loaded":
          return this.handleLoadedRequest(this.myId, request.payload.loaded.isLoaded, now);
        case "endGame":
          return [this.makeGameEndPacket(request.payload.endGame.gameResult)];
        case "blank":
        case "plant":
        case "removePlant":
        case "starShards":
          return this.handleInGameRequest(request, now);
        default:
          return [];
      }
    } catch (error) {
      console.error("MockServer: Failed to parse message:", error);
      return [];
    }
  }

  private handleReadyRequest(clientId: number, isReady: boolean, now: number): MockPacket[] {
    const client = this.ensureClient(clientId, now);
    client.lastSeenAt = now;
    client.isReady = isReady;

    const readyCount = this.getReadyCount();
    const packets: MockPacket[] = [this.makeUpdateReadyCountPacket(readyCount, this.clients.size)];
    this.trace("handleReadyRequest", {
      clientId,
      isReady,
      readyCount,
      clientCount: this.clients.size
    });
    if (this.areAllClientsReady()) {
      packets.push(this.makeAllReadyPacket());
    }
    return packets;
  }

  private handleLoadedRequest(clientId: number, isLoaded: boolean, now: number): MockPacket[] {
    const client = this.ensureClient(clientId, now);
    client.lastSeenAt = now;
    client.isLoaded = isLoaded;
    this.trace("handleLoadedRequest", {
      clientId,
      isLoaded,
      allClientsLoaded: this.areAllClientsLoaded(),
      serverFrameIdBeforeAdvance: this.serverFrameId
    });
    if (!this.areAllClientsLoaded()) {
      return [];
    }
    if (this.gameStartedAt === 0) {
      this.gameStartedAt = now;
    }
    this.advanceFrames(now);
    return [this.makeAllLoadedPacket(), ...this.collectPacketsForClient(client.id)];
  }

  private handleInGameRequest(request: Request, now: number): MockPacket[] {
    if (!this.areAllClientsLoaded()) {
      return [];
    }

    const client = this.ensureClient(this.myId, now);
    client.lastSeenAt = now;

    const ackFrameId = this.extractAckFrameId(request);
    if (ackFrameId !== undefined) {
      client.ackFrameId = Math.max(client.ackFrameId, ackFrameId);
    }
    this.trace("handleInGameRequest", {
      type: request.payload.oneofKind,
      clientId: client.id,
      ackFrameId,
      clientAckFrameId: client.ackFrameId,
      serverFrameId: this.serverFrameId,
      highestSubmittedFrame: client.highestSubmittedFrame
    });

    if (request.payload.oneofKind !== "blank") {
      const targetFrameId = this.extractTargetFrameId(request);
      if (targetFrameId !== undefined) {
        this.recordSubmission(targetFrameId, client.id, request);
        client.highestSubmittedFrame = Math.max(client.highestSubmittedFrame, targetFrameId);
      }
    }

    this.advanceFrames(now);
    this.pruneHistories();
    return this.collectPacketsForClient(client.id);
  }

  private ensureClient(clientId: number, now: number): ClientSession {
    const client = this.clients.get(clientId);
    if (client) {
      return client;
    }
    const created: ClientSession = {
      id: clientId,
      ackFrameId: 0,
      lastSeenAt: now,
      highestSubmittedFrame: 0,
      isReady: false,
      isLoaded: false
    };
    this.clients.set(clientId, created);
    return created;
  }

  private cleanupTimedOutClients(now: number) {
    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastSeenAt > this.clientTimeoutMs) {
        this.clients.delete(clientId);
      }
    }
  }

  private extractAckFrameId(request: Request): number | undefined {
    switch (request.payload.oneofKind) {
      case "blank":
        return request.payload.blank.ackFrameId;
      case "plant":
        return request.payload.plant.base?.base?.ackFrameId;
      case "removePlant":
        return request.payload.removePlant.base?.base?.ackFrameId;
      case "starShards":
        return request.payload.starShards.base?.base?.ackFrameId;
      default:
        return undefined;
    }
  }

  private extractTargetFrameId(request: Request): number | undefined {
    switch (request.payload.oneofKind) {
      case "plant":
        return this.resolveOperationFrame(request.payload.plant.base);
      case "removePlant":
        return this.resolveOperationFrame(request.payload.removePlant.base);
      case "starShards":
        return this.resolveOperationFrame(request.payload.starShards.base);
      default:
        return undefined;
    }
  }

  private resolveOperationFrame(base: RequestGridOperation | undefined): number {
    const reportedCurrentFrame = Math.max(
      base?.base?.frameId ?? 0,
      base?.base?.ackFrameId ?? 0
    );
    const earliestServerFrame = reportedCurrentFrame + this.getCurrentLeadFrames();
    const requestedFrame = base?.processFrameId ?? 0;
    return Math.max(requestedFrame, earliestServerFrame);
  }

  private getCurrentLeadFrames(): number {
    return this.estimatedLeadFrames + this.baseDeltaFrames;
  }

  private getMaxClientAckFrameId(): number {
    let maxAckFrameId = 0;
    for (const client of this.clients.values()) {
      maxAckFrameId = Math.max(maxAckFrameId, client.ackFrameId);
    }
    return maxAckFrameId;
  }

  private recordSubmission(frameId: number, clientId: number, request: Request) {
    const operation = this.buildOperationForFrame(frameId, request, clientId);
    if (!operation) {
      return;
    }

    const existingFrame = this.frameHistory.get(frameId);
    if (existingFrame) {
      const signature = this.getOperationSignature(operation);
      const hasDuplicate = existingFrame.operations.some(
        existingOperation => this.getOperationSignature(existingOperation) === signature
      );
      if (hasDuplicate) {
        return;
      }
      existingFrame.operations.push(operation);
      existingFrame.operations.sort((a, b) => this.compareInGameOperations(a, b));
      this.frameHistory.set(frameId, existingFrame);
      this.trace("recordSubmission appended to existing frameHistory", {
        frameId,
        operationKind: operation.payload.oneofKind,
        operationCount: existingFrame.operations.length
      });
      return;
    }

    let submission = this.scheduledFrames.get(frameId);
    if (!submission) {
      submission = {
        operations: [],
        operationSignatures: new Set<string>()
      };
      this.scheduledFrames.set(frameId, submission);
    }

    const signature = this.getOperationSignature(operation);
    if (submission.operationSignatures.has(signature)) {
      return;
    }
    submission.operationSignatures.add(signature);
    submission.operations.push(operation);
    this.trace("recordSubmission queued for future frame", {
      frameId,
      operationKind: operation.payload.oneofKind,
      operationCount: submission.operations.length
    });
  }

  private advanceFrames(now: number) {
    if (this.gameStartedAt === 0) {
      this.gameStartedAt = now;
    }
    const realTimeFrameId = Math.max(1, Math.floor((now - this.gameStartedAt) / 50) + 1);
    const bufferedTargetFrameId = this.getMaxClientAckFrameId() + this.getCurrentLeadFrames();
    const targetServerFrameId = Math.max(realTimeFrameId, bufferedTargetFrameId);
    this.trace("advanceFrames", {
      now,
      gameStartedAt: this.gameStartedAt,
      serverFrameIdBefore: this.serverFrameId,
      realTimeFrameId,
      bufferedTargetFrameId,
      targetServerFrameId
    });
    while (this.serverFrameId < targetServerFrameId) {
      const frameId = this.serverFrameId + 1;
      const scheduled = this.scheduledFrames.get(frameId);
      const operations = scheduled
        ? [...scheduled.operations].sort((a, b) => this.compareInGameOperations(a, b))
        : [];
      this.serverFrameId = frameId;
      this.frameHistory.set(frameId, {
        frameId,
        operations
      });
      this.trace("generated frame", {
        frameId,
        operationCount: operations.length
      });
      this.scheduledFrames.delete(frameId);
    }
  }

  private getReadyCount(): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.isReady) {
        count += 1;
      }
    }
    return count;
  }

  private areAllClientsReady(): boolean {
    return this.clients.size > 0 && this.getReadyCount() === this.clients.size;
  }

  private areAllClientsLoaded(): boolean {
    if (this.clients.size === 0) {
      return false;
    }
    for (const client of this.clients.values()) {
      if (!client.isLoaded) {
        return false;
      }
    }
    return true;
  }

  private collectPacketsForClient(clientId: number): MockPacket[] {
    const client = this.clients.get(clientId);
    if (!client) {
      return [];
    }

    const packets: MockPacket[] = [];
    const fromFrameId = Math.max(client.ackFrameId + 1, this.getEarliestHistoryFrame());
    const toFrameId = Math.min(this.serverFrameId, fromFrameId + this.maxResendPerPull - 1);
    this.trace("collectPacketsForClient", {
      clientId,
      clientAckFrameId: client.ackFrameId,
      serverFrameId: this.serverFrameId,
      fromFrameId,
      toFrameId,
      historySize: this.frameHistory.size
    });
    for (let frameId = fromFrameId; frameId <= toFrameId; frameId++) {
      const frame = this.frameHistory.get(frameId);
      if (!frame) {
        continue;
      }
      packets.push({
        channel: "ingame",
        data: InGameResponse.toBinary(frame)
      });
    }
    this.trace("collectPacketsForClient result", {
      clientId,
      packetCount: packets.length,
      frameIds: packets.map(packet => InGameResponse.fromBinary(packet.data).frameId)
    });
    return packets;
  }

  private getEarliestHistoryFrame(): number {
    if (this.frameHistory.size === 0) {
      return this.serverFrameId + 1;
    }
    let minFrameId = Number.MAX_SAFE_INTEGER;
    for (const frameId of this.frameHistory.keys()) {
      minFrameId = Math.min(minFrameId, frameId);
    }
    return minFrameId;
  }

  private pruneHistories() {
    if (this.frameHistory.size === 0) {
      return;
    }

    let minAckFrameId = this.serverFrameId;
    if (this.clients.size > 0) {
      minAckFrameId = Number.MAX_SAFE_INTEGER;
      for (const client of this.clients.values()) {
        minAckFrameId = Math.min(minAckFrameId, client.ackFrameId);
      }
    }

    for (const frameId of this.frameHistory.keys()) {
      const tooOldForAck = frameId <= minAckFrameId;
      const tooOldForWindow = frameId <= this.serverFrameId - this.maxHistoryFrames;
      if (tooOldForAck || tooOldForWindow) {
        this.frameHistory.delete(frameId);
      }
    }
  }

  private buildOperationForFrame(frameId: number, request: Request, clientId: number): InGameOperation | null {
    switch (request.payload.oneofKind) {
      case "plant":
        return this.buildCardPlantOperation(frameId, request.payload.plant, clientId);
      case "removePlant":
        return this.buildRemovePlantOperation(frameId, request.payload.removePlant, clientId);
      case "starShards":
        return this.buildStarShardsOperation(frameId, request.payload.starShards, clientId);
      default:
        return null;
    }
  }

  private nextOperationIndex(): number {
    this.operationSerial += 1;
    return this.operationSerial;
  }

  private getOperationUid(operation: InGameOperation): number {
    switch (operation.payload.oneofKind) {
      case "removePlant":
        return operation.payload.removePlant.base?.uid ?? Number.MAX_SAFE_INTEGER;
      case "useStarShards":
        return operation.payload.useStarShards.base?.uid ?? Number.MAX_SAFE_INTEGER;
      case "cardPlant":
        return operation.payload.cardPlant.base?.uid ?? Number.MAX_SAFE_INTEGER;
      default:
        return Number.MAX_SAFE_INTEGER;
    }
  }

  private compareInGameOperations(a: InGameOperation, b: InGameOperation): number {
    if (a.processFrameId !== b.processFrameId) {
      return a.processFrameId - b.processFrameId;
    }

    const aTypePriority = inGameOperationTypePriority[a.payload.oneofKind ?? ""] ?? Number.MAX_SAFE_INTEGER;
    const bTypePriority = inGameOperationTypePriority[b.payload.oneofKind ?? ""] ?? Number.MAX_SAFE_INTEGER;
    if (aTypePriority !== bTypePriority) {
      return aTypePriority - bTypePriority;
    }

    const aUid = this.getOperationUid(a);
    const bUid = this.getOperationUid(b);
    if (aUid !== bUid) {
      return aUid - bUid;
    }

    return a.operationIndex - b.operationIndex;
  }

  private buildCardPlantOperation(frameId: number, request: RequestCardPlant, clientId: number): InGameOperation | null {
    if (!request.base) {
      return null;
    }
    return {
      processFrameId: frameId,
      operationIndex: this.nextOperationIndex(),
      payload: {
        oneofKind: "cardPlant",
        cardPlant: {
          pid: request.pid,
          level: request.level,
          cost: request.cost,
          base: {
            uid: clientId,
            col: request.base.col,
            row: request.base.row
          }
        }
      }
    };
  }

  private buildRemovePlantOperation(frameId: number, request: RequestRemovePlant, clientId: number): InGameOperation | null {
    if (!request.base) {
      return null;
    }
    return {
      processFrameId: frameId,
      operationIndex: this.nextOperationIndex(),
      payload: {
        oneofKind: "removePlant",
        removePlant: {
          pid: request.pid,
          base: {
            uid: clientId,
            col: request.base.col,
            row: request.base.row
          }
        }
      }
    };
  }

  private buildStarShardsOperation(frameId: number, request: RequestStarShards, clientId: number): InGameOperation | null {
    if (!request.base) {
      return null;
    }
    return {
      processFrameId: frameId,
      operationIndex: this.nextOperationIndex(),
      payload: {
        oneofKind: "useStarShards",
        useStarShards: {
          pid: request.pid,
          cost: request.cost,
          base: {
            uid: clientId,
            col: request.base.col,
            row: request.base.row
          }
        }
      }
    };
  }

  private getOperationSignature(operation: InGameOperation): string {
    switch (operation.payload.oneofKind) {
      case "cardPlant":
        return [
          operation.processFrameId,
          operation.payload.oneofKind,
          operation.payload.cardPlant.pid,
          operation.payload.cardPlant.level,
          operation.payload.cardPlant.base?.uid,
          operation.payload.cardPlant.base?.col,
          operation.payload.cardPlant.base?.row
        ].join(":");
      case "removePlant":
        return [
          operation.processFrameId,
          operation.payload.oneofKind,
          operation.payload.removePlant.pid,
          operation.payload.removePlant.base?.uid,
          operation.payload.removePlant.base?.col,
          operation.payload.removePlant.base?.row
        ].join(":");
      case "useStarShards":
        return [
          operation.processFrameId,
          operation.payload.oneofKind,
          operation.payload.useStarShards.pid,
          operation.payload.useStarShards.base?.uid,
          operation.payload.useStarShards.base?.col,
          operation.payload.useStarShards.base?.row
        ].join(":");
      default:
        return `${operation.processFrameId}:${operation.operationIndex}:${operation.payload.oneofKind}`;
    }
  }

  private makeChooseMapPacket(chapterId: number, stageId: number): MockPacket {
    return {
      channel: "room",
      data: RoomResponse.toBinary({
        payload: {
          oneofKind: "chooseMap",
          chooseMap: { chapterId, stageId }
        }
      })
    };
  }

  private makeQuitChooseMapPacket(): MockPacket {
    return {
      channel: "room",
      data: RoomResponse.toBinary({
        payload: {
          oneofKind: "quitChooseMap",
          quitChooseMap: {}
        }
      })
    };
  }

  private makeUpdateReadyCountPacket(count: number, allPlayerCount: number): MockPacket {
    return {
      channel: "room",
      data: RoomResponse.toBinary({
        payload: {
          oneofKind: "updateReadyCount",
          updateReadyCount: { count, allPlayerCount }
        }
      })
    };
  }

  private makeAllReadyPacket(): MockPacket {
    const playerIds = [...this.clients.keys()].sort((a, b) => a - b);
    return {
      channel: "room",
      data: RoomResponse.toBinary({
        payload: {
          oneofKind: "allReady",
          allReady: {
            allPlayerCount: playerIds.length,
            seed: this.seed,
            myId: this.myId,
            playerIds
          }
        }
      })
    };
  }

  private makeAllLoadedPacket(): MockPacket {
    return {
      channel: "room",
      data: RoomResponse.toBinary({
        payload: {
          oneofKind: "allLoaded",
          allLoaded: {}
        }
      })
    };
  }

  private makeGameEndPacket(gameResult: number): MockPacket {
    return {
      channel: "room",
      data: RoomResponse.toBinary({
        payload: {
          oneofKind: "gameEnd",
          gameEnd: { gameResult }
        }
      })
    };
  }
}

const mockServer = new MockServer();

export default mockServer;
export { MockServer };
