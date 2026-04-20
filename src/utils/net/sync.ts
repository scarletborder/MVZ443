import QueueReceive from "../../game/sync/queue_receive";
import QueueSend from "../../game/sync/queue_send";
import { Request } from "../../pb/request";
import { InGameResponse } from "../../pb/response";
import EnumGameStage from "./game_state";
import WSClientHandlers from "./handlers";
import { onlineStateManager } from "../../store/OnlineStateManager";
import mockServer, { MockPacket } from "./mock_server";

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: WSClientHandlers = new WSClientHandlers(this);

  private receiveQueue: QueueReceive | null = null;
  private sendQueue: QueueSend | null = null;
  private mockRoomMode: boolean = false;
  public url: string = "";

  private messageCounter: number = 0;
  private debugLatencyConfig = {
    sendLatencyMs: 0,
    receiveLatencyMs: 0
  };
  private pendingSendTimers: Set<number> = new Set();
  private pendingReceiveTimers: Set<number> = new Set();
  private pendingInGameResponses: InGameResponse[] = [];

  private trace(message: string, details?: unknown) {
    if (details !== undefined) {
      console.log(`[BackendWS] ${message}`, details);
      return;
    }
    console.log(`[BackendWS] ${message}`);
  }

  setQueue(receiveQueue: QueueReceive, sendQueue: QueueSend) {
    this.receiveQueue = receiveQueue;
    this.sendQueue = sendQueue;
    this.trace("setQueue bound", {
      pendingInGameResponses: this.pendingInGameResponses.length
    });
    this.flushPendingInGameResponses();
  }

  getReceiveQueue() {
    return this.receiveQueue;
  }

  enqueuePendingInGameResponse(response: InGameResponse) {
    this.pendingInGameResponses.push(response);
    this.trace("buffered ingame response before queue binding", {
      frameId: response.frameId,
      bufferedCount: this.pendingInGameResponses.length
    });
    this.flushPendingInGameResponses();
  }

  getDebugLatencyConfig() {
    return { ...this.debugLatencyConfig };
  }

  setDebugSendLatencyMs(latencyMs: number) {
    this.debugLatencyConfig.sendLatencyMs = Math.max(0, Math.floor(latencyMs));
  }

  setDebugReceiveLatencyMs(latencyMs: number) {
    this.debugLatencyConfig.receiveLatencyMs = Math.max(0, Math.floor(latencyMs));
  }

  isLord() {
    return onlineStateManager.isLord();
  }

  public GetFrameID() {
    return this.receiveQueue?.currentFrameId ?? 0;
  }

  public GetNextFrameID() {
    return (this.receiveQueue?.currentFrameId ?? 0) + 1;
  }

  public GoToFrameID(target: number = this.GetFrameID() + 1) {
    if (this.receiveQueue) {
      this.receiveQueue.currentFrameId = target;
    }
  }

  public ResetGameData() {
    onlineStateManager.resetGameData();
    this.pendingInGameResponses = [];
    if (this.receiveQueue) {
      this.receiveQueue.currentFrameId = 0;
      this.receiveQueue.lastAckFrameId = 0;
    }
  }

  private dispatchMockPackets(packets: MockPacket[]) {
    this.trace("dispatchMockPackets", {
      packetCount: packets.length,
      channels: packets.map(packet => packet.channel)
    });
    for (const packet of packets) {
      switch (packet.channel) {
        case 'lobby':
          this.scheduleIncomingPacket(() => this.handlers.handleLobbyResponse(packet.data));
          break;
        case 'room':
          this.scheduleIncomingPacket(() => this.handlers.handleRoomResponse(packet.data));
          break;
        case 'ingame':
          this.scheduleIncomingPacket(() => this.handlers.handleInGameResponse(packet.data));
          break;
        default:
          break;
      }
    }
  }

  private trackTimer(timerSet: Set<number>, callback: () => void, delayMs: number) {
    const timerId = window.setTimeout(() => {
      timerSet.delete(timerId);
      callback();
    }, delayMs);
    timerSet.add(timerId);
  }

  private scheduleIncomingPacket(handler: () => void) {
    const delayMs = this.debugLatencyConfig.receiveLatencyMs;
    if (delayMs <= 0) {
      handler();
      return;
    }
    this.trace("schedule incoming packet", { delayMs });
    this.trackTimer(this.pendingReceiveTimers, handler, delayMs);
  }

  private clearPendingTimers() {
    for (const timerId of this.pendingSendTimers) {
      window.clearTimeout(timerId);
    }
    this.pendingSendTimers.clear();

    for (const timerId of this.pendingReceiveTimers) {
      window.clearTimeout(timerId);
    }
    this.pendingReceiveTimers.clear();
  }

  private flushPendingInGameResponses() {
    if (!this.receiveQueue || this.pendingInGameResponses.length === 0) {
      return;
    }
    this.trace("flush pending ingame responses", {
      count: this.pendingInGameResponses.length
    });
    for (const response of this.pendingInGameResponses) {
      this.receiveQueue.handleInGameResponse(response);
    }
    this.pendingInGameResponses = [];
  }

  private dispatchBinaryMessage(message: Uint8Array<ArrayBufferLike>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.trace("send binary via websocket", {
        byteLength: message.byteLength
      });
      this.ws.send(message.buffer as ArrayBuffer);
      return;
    }

    if (this.mockRoomMode && mockServer.isActive()) {
      this.trace("send binary to mock server", {
        byteLength: message.byteLength
      });
      const packets = mockServer.handleMessage(message);
      this.dispatchMockPackets(packets);
      return;
    }

    console.error("No active transport. Cannot send message.");
  }

  public startSinglePlayerRoom() {
    if (this.mockRoomMode) {
      return;
    }
    this.trace("startSinglePlayerRoom");
    this.ResetGameData();
    this.mockRoomMode = true;
    this.dispatchMockPackets(mockServer.startSingleRoom());
  }

  public closeMockRoom() {
    if (!this.mockRoomMode) {
      return;
    }
    this.clearPendingTimers();
    this.mockRoomMode = false;
    mockServer.stop();
    this.ResetGameData();
  }

  setConnectionUrl(url: string) {
    this.url = url;
  }

  startConnection() {
    console.log('try to link');
    this.ResetGameData();
    onlineStateManager.updateRoomInfo(-1, 51, 50);
    if (onlineStateManager.getIsOnlineMode()) {
      console.error("WebSocket connection already established.");
      return;
    }
    if (!this.url) {
      console.error("WebSocket URL not set!");
      return;
    }

    this.ws = new WebSocket(this.url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      console.log("WebSocket connection established.");
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.messageCounter++;
      if (!(event.data instanceof ArrayBuffer)) {
        console.warn(`Message #${this.messageCounter}: Received non-binary message, ignoring:`, event.data);
        return;
      }

      const data = new Uint8Array(event.data);
      this.scheduleIncomingPacket(() => {
        try {
          if (!onlineStateManager.getIsOnlineMode()) {
            this.handlers.handleLobbyResponse(data);
          } else {
            switch (onlineStateManager.getCurrentGameStage()) {
              case EnumGameStage.InLobby:
              case EnumGameStage.Preparing:
              case EnumGameStage.Loading:
                this.handlers.handleRoomResponse(data);
                break;
              case EnumGameStage.InGame:
                this.handlers.handleInGameResponse(data);
                break;
              case EnumGameStage.PostGame:
                break;
              default:
                console.error("Unknown game stage:", onlineStateManager.getCurrentGameStage());
                break;
            }
          }
        } catch (e) {
          console.error("Failed to parse Protobuf message:", e);
          alert("发生错误,请检查网络或服务器: " + (e instanceof Error ? e.message : String(e)));
          this.closeConnection();
        }
      });
    };

    this.ws.onerror = (error: Event) => {
      console.error("WebSocket error: ", error);
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.clearPendingTimers();
      this.ws = null;
      console.log("WebSocket connection closed:", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        timeStamp: new Date().toISOString(),
        onlineMode: onlineStateManager.getIsOnlineMode(),
        gameStage: onlineStateManager.getGameStageName(),
        roomInfo: onlineStateManager.getRoomInfo()
      });
      onlineStateManager.updateOnlineMode(false);
    };
  }

  sendMessage(message: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      console.log("Message sent:", message);
    } else {
      console.error("WebSocket is not open. Cannot send message.");
    }
  }

  sendBlankFrame(frameId: number) {
    if (this.sendQueue) {
      this.sendQueue.sendBlankFrame(frameId);
    } else {
      console.error("sendQueue not available. Cannot send blank frame.");
    }
  }

  send(message: Uint8Array<ArrayBufferLike>) {
    const sendNow = () => this.dispatchBinaryMessage(message);

    const delayMs = this.debugLatencyConfig.sendLatencyMs;
    if (delayMs <= 0) {
      sendNow();
      return;
    }

    this.trace("schedule outgoing message", {
      delayMs,
      byteLength: message.byteLength
    });
    this.trackTimer(this.pendingSendTimers, sendNow, delayMs);
  }

  consumeSendQueue() {
    if (!this.sendQueue) {
      return;
    }

    if ((this.ws && this.ws.readyState === WebSocket.OPEN) || this.mockRoomMode) {
      while (!this.sendQueue.queues.isEmpty()) {
        const message = this.sendQueue.queues.shift();
        if (message) {
          const binary = Request.toBinary(message);
          this.send(binary);
        }
      }
    } else {
      console.error("No active transport. Cannot consume send queue.");
    }
  }

  closeConnection() {
    this.clearPendingTimers();

    if (this.mockRoomMode) {
      this.closeMockRoom();
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      this.ws = null;
      onlineStateManager.resetAllState();
      this.ResetGameData();
    } else {
      console.error("WebSocket is not open. Cannot close connection.");
    }
  }

  disconnectQueues() {
    this.receiveQueue = null;
    this.sendQueue = null;
    this.pendingInGameResponses = [];
  }

  hasConnected() {
    return onlineStateManager.getIsOnlineMode();
  }

  get key(): string {
    return onlineStateManager.getConnectionKey();
  }

  set key(value: string) {
    onlineStateManager.updateConnectionKey(value);
  }

  get room_id(): number {
    return onlineStateManager.getRoomInfo().roomId;
  }

  get my_id(): number {
    return onlineStateManager.getRoomInfo().myId;
  }

  get lord_id(): number {
    return onlineStateManager.getRoomInfo().lordId;
  }

  get FrameID(): number {
    return this.GetFrameID();
  }

  set FrameID(value: number) {
    if (this.receiveQueue) {
      this.receiveQueue.currentFrameId = value;
    }
  }

  get AckFrameID(): number {
    return this.receiveQueue?.lastAckFrameId ?? 0;
  }

  set AckFrameID(value: number) {
    if (this.receiveQueue) {
      this.receiveQueue.lastAckFrameId = value;
    }
  }

  isOnlineMode(): boolean {
    return (!this.isMockRoomMode()) && onlineStateManager.getIsOnlineMode();
  }

  isMockRoomMode(): boolean {
    return this.mockRoomMode;
  }

  isRoomSessionMode(): boolean {
    return this.isOnlineMode() || this.isMockRoomMode();
  }
}

const BackendWS = new WebSocketClient();

export function HasConnected() {
  return BackendWS.hasConnected();
}

export { WebSocketClient };

export default BackendWS;
