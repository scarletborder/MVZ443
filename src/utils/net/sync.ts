import QueueReceive from "../../game/sync/queue_receive";
import QueueSend from "../../game/sync/queue_send";
import { Request } from "../../pb/request";
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

  setQueue(receiveQueue: QueueReceive, sendQueue: QueueSend) {
    this.receiveQueue = receiveQueue;
    this.sendQueue = sendQueue;
  }

  getReceiveQueue() {
    return this.receiveQueue;
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
    if (this.receiveQueue) {
      this.receiveQueue.currentFrameId = 0;
      this.receiveQueue.lastAckFrameId = 0;
    }
  }

  private dispatchMockPackets(packets: MockPacket[]) {
    for (const packet of packets) {
      switch (packet.channel) {
        case 'lobby':
          this.handlers.handleLobbyResponse(packet.data);
          break;
        case 'room':
          this.handlers.handleRoomResponse(packet.data);
          break;
        case 'ingame':
          this.handlers.handleInGameResponse(packet.data);
          break;
        default:
          break;
      }
    }
  }

  public startSinglePlayerRoom() {
    if (this.mockRoomMode) {
      return;
    }
    this.ResetGameData();
    this.mockRoomMode = true;
    this.dispatchMockPackets(mockServer.startSingleRoom());
  }

  public closeMockRoom() {
    if (!this.mockRoomMode) {
      return;
    }
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
    };

    this.ws.onerror = (error: Event) => {
      console.error("WebSocket error: ", error);
    };

    this.ws.onclose = (event: CloseEvent) => {
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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message.buffer as ArrayBuffer);
      return;
    }

    if (this.mockRoomMode && mockServer.isActive()) {
      const packets = mockServer.handleMessage(message);
      this.dispatchMockPackets(packets);
      return;
    }

    console.error("No active transport. Cannot send message.");
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
