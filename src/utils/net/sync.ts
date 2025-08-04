// network client
import QueueReceive from "../../game/sync/queue_receive";
import QueueSend from "../../game/sync/queue_send";
import { Request } from "../../pb/request";
import EnumGameStage from "./game_state";
import WSClientHandlers from "./handlers";
import { FrameDeltaEstimator } from "./frame_delta";
import { onlineStateManager } from "../../store/OnlineStateManager";

class WebSocketClient {
    private ws: WebSocket | null = null;
    private handlers: WSClientHandlers = new WSClientHandlers(this);

    private receiveQueue: QueueReceive | null = null;
    private sendQueue: QueueSend | null = null;
    public url: string = "";

    // 帧时间差值估算器
    private frameDeltaEstimator: FrameDeltaEstimator = new FrameDeltaEstimator();

    private messageCounter: number = 0;

    constructor() {
        // 不再需要旧的默认处理器
    }

    setQueue(receiveQueue: QueueReceive, sendQueue: QueueSend) {
        this.receiveQueue = receiveQueue;
        this.sendQueue = sendQueue;
    }

    // 获取接收队列的公共方法
    getReceiveQueue() {
        return this.receiveQueue;
    }

    isLord() {
        return onlineStateManager.isLord();
    }

    public GetFrameID() {
        return onlineStateManager.getFrameId();
    }

    public GetNextFrameID() {
        return onlineStateManager.getNextFrameId();
    }

    public GoToFrameID(target: number = onlineStateManager.getFrameId() + 1) {
        onlineStateManager.goToFrameId(target);
    }

    // 更新帧接收时间
    public updateFrameReceiveTime() {
        this.frameDeltaEstimator.updateFrameReceiveTime();
    }

    // 获取最近两帧的时间差值
    public getFrameTimeDelta(): number {
        return this.frameDeltaEstimator.getFrameTimeDelta();
    }

    // 计算与服务器的帧差值
    // 基于逻辑帧间隔（FrameTick）计算
    public calculateServerFrameDiff(): number {
        return this.frameDeltaEstimator.calculateServerFrameDiff();
    }

    // 重置在线游戏的状态
    // 在某轮游戏结束后/刚加入房间时调用/退出房间时调用
    // 不会清理onlieMode
    public ResetGameData() {
        onlineStateManager.resetGameData();
        this.frameDeltaEstimator.reset();
    }

    // Method to set WebSocket server URL
    setConnectionUrl(url: string) {
        this.url = url;
    }

    // Method to establish a WebSocket connection
    startConnection() {
        console.log('try to link');
        this.ResetGameData();
        onlineStateManager.updateRoomInfo(-1, 51, 50); // reset
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

            // console.log(`Message #${this.messageCounter} received:`, event.data);

            const data = new Uint8Array(event.data);
            // console.log(`Message #${this.messageCounter}: Processing message, onlineMode:`, onlineStateManager.getIsOnlineMode(), "gameStage:", onlineStateManager.getCurrentGameStage());

            try {
                if (!onlineStateManager.getIsOnlineMode()) {
                    // 尚未确定与房间建立联系
                    console.log(`Message #${this.messageCounter}: Handling as LobbyResponse`);
                    this.handlers.handleLobbyResponse(data);
                } else {
                    // 已经在房间内部
                    // console.log(`Message #${this.messageCounter}: Handling as RoomResponse, current stage:`, onlineStateManager.getCurrentGameStage());
                    switch (onlineStateManager.getCurrentGameStage()) {
                        case EnumGameStage.InLobby:
                            this.handlers.handleRoomResponse(data);
                            break;
                        case EnumGameStage.Preparing:
                            this.handlers.handleRoomResponse(data);
                            break;
                        case EnumGameStage.Loading:
                            this.handlers.handleRoomResponse(data);
                            break;
                        case EnumGameStage.InGame:
                            this.updateFrameReceiveTime(); // 在游戏内更新帧时间
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
                // 发生解析错误可能意味着协议不同步，关闭连接
                console.error("Failed to parse Protobuf message:", e);
                console.error("Error stack:", e instanceof Error ? e.stack : e);
                console.error("Message details:", {
                    dataLength: data.length,
                    firstBytes: Array.from(data.slice(0, Math.min(20, data.length))),
                    onlineMode: onlineStateManager.getIsOnlineMode(),
                    gameStage: onlineStateManager.getCurrentGameStage(),
                    errorMessage: e instanceof Error ? e.message : String(e)
                });
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

    // Method to manually send a message through the WebSocket
    sendMessage(message: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
            console.log("Message sent:", message);
        } else {
            console.error("WebSocket is not open. Cannot send message.");
        }
    }

    // Method to send blank frame for heartbeat
    sendBlankFrame(frameId: number) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.sendQueue) {
            // 使用sendQueue发送blank frame
            this.sendQueue.sendBlankFrame(frameId);
        } else {
            console.error("WebSocket is not open or sendQueue not available. Cannot send blank frame.");
        }
    }

    send(message: Uint8Array<ArrayBufferLike>) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message.buffer); // 发送的是 ArrayBuffer
            console.log("Sent binary message:", message);
        } else {
            console.error("WebSocket is not open. Cannot send message.");
        }
    }

    // Method to send messages from the sendQueue to the WebSocket
    consumeSendQueue() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            while (this.sendQueue && !this.sendQueue.queues.isEmpty()) {
                const message = this.sendQueue.queues.shift();
                if (message) {
                    // 使用protobuf编码发送消息到WebSocket
                    // 将消息序列化为二进制格式后发送
                    this.ws.send(Request.toBinary(message));
                }
            }
        } else {
            console.error("WebSocket is not open. Cannot consume send queue.");
        }
    }

    // Method to close the WebSocket connection
    closeConnection() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
            this.ws = null;
            console.log("WebSocket connection closed.");
            onlineStateManager.resetAllState();
            this.ResetGameData();
        } else {
            console.error("WebSocket is not open. Cannot close connection.");
        }
    }

    // Method to disconnect message queues from the WebSocket
    disconnectQueues() {
        this.receiveQueue = null;
        this.sendQueue = null;
        console.log("Disconnected send and receive queues.");
    }

    // Check if the WebSocket is connected
    hasConnected() {
        return onlineStateManager.getIsOnlineMode();
    }

    // 公开属性访问器，为了保持向后兼容性
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
        return onlineStateManager.getFrameId();
    }

    set FrameID(value: number) {
        onlineStateManager.updateFrameId(value);
    }

    get AckFrameID(): number {
        return onlineStateManager.getAckFrameId();
    }

    set AckFrameID(value: number) {
        onlineStateManager.updateAckFrameId(value);
    }

    isOnlineMode(): boolean {
        return onlineStateManager.getIsOnlineMode();
    }
}

const BackendWS = new WebSocketClient();

export function HasConnected() {
    return BackendWS.hasConnected();
}

export { WebSocketClient };

export default BackendWS;