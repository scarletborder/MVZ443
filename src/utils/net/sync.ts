// network client
import QueueReceive from "../../game/sync/queue_receive";
import QueueSend from "../../game/sync/queue_send";
import { Request } from "../../pb/request";
import EnumGameStage from "./game_state";
import WSClientHandlers from "./handlers";
import { FrameDeltaEstimator } from "./frame_delta";

class WebSocketClient {
    private ws: WebSocket | null = null;
    private handlers: WSClientHandlers = new WSClientHandlers(this);

    private receiveQueue: QueueReceive | null = null;
    private sendQueue: QueueSend | null = null;
    public url: string = "";

    private additionalListeners: ((event: MessageEvent) => void)[] = [];

    // 状态
    public isOnlineMode: boolean = false; // 是否是在线游戏(已经在房间内部)
    public gameStage: number = 0; // 游戏状态

    public key: string = "";// 连接密钥, 全局设置用于创建房间和加入房间, TODO： 后续有更好看的ui
    public room_id: number = -1;// 房间号

    public my_id: number = 51;// 玩家ID
    public lord_id: number = 50;// 房主ID

    public FrameID: number = 0; // 当前帧ID
    public AckFrameID: number = 0; // 确认的上次服务器权威帧ID

    // 帧时间差值估算器
    private frameDeltaEstimator: FrameDeltaEstimator = new FrameDeltaEstimator();

    constructor() {
        // 创建一个默认的Handler
        const defaultLordHandler = (event: MessageEvent) => {
            console.log(event.data);
            // 不再需要， 因为现在通过 protobuf     
            // const data = JSON.parse(event.data);
            // if (data.type === 0x00) {
            //     this.lord_id = data.lordID;
            //     this.my_id = data.myID;
            // }
        }
        this.additionalListeners.push(defaultLordHandler);
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
        return this.my_id === this.lord_id;
    }

    public GetFrameID() {
        return this.FrameID;
    }

    public GetNextFrameID() {
        return this.FrameID + 1;
    }

    public GoToFrameID(target: number = this.FrameID + 1) {
        this.FrameID = target;
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
        this.FrameID = 0;
        this.AckFrameID = 0;
        this.gameStage = EnumGameStage.InLobby;
        this.frameDeltaEstimator.reset();
    }

    // Method to set WebSocket server URL
    setConnectionUrl(url: string) {
        this.url = url;
    }

    // Method to establish a WebSocket connection
    startConnection() {
        console.log('try to link');
        this.lord_id = 50; // reset
        this.my_id = 51; // reset
        if (this.isOnlineMode) {
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
            if (!(event.data instanceof ArrayBuffer)) {
                console.warn("Received non-binary message, ignoring:", event.data);
                return;
            }

            const data = new Uint8Array(event.data);

            try {
                if (!this.isOnlineMode) {
                    // 尚未确定与房间建立联系
                    this.handlers.handleLobbyResponse(data);
                } else {
                    // 已经在房间内部
                    switch (this.gameStage) {
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
                            console.error("Unknown game stage:", this.gameStage);
                            break;
                    }
                }
                // 现在完全不需要了，因为protobuf已经处理了
                this.onMessageReceived(event);
            } catch (e) {
                // 发生解析错误可能意味着协议不同步，关闭连接
                console.error("Failed to parse Protobuf message:", e);
                alert("发生错误,请检查网络或服务器");
                this.closeConnection();
            }
        };

        this.ws.onerror = (error: Event) => {
            console.error("WebSocket error: ", error);
        };

        this.ws.onclose = () => {
            console.log("WebSocket connection closed.");
            this.isOnlineMode = false;
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
            console.log("Sending blank frame:", frameId);
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

    // Method to add additional message listeners
    addMessageListener(listener: (event: MessageEvent) => void) {
        this.additionalListeners.push(listener);
    }

    delMessageListener(listener: (event: MessageEvent) => void) {
        const index = this.additionalListeners.indexOf(listener);
        if (index > -1) {
            this.additionalListeners.splice(index, 1);
        }
    }

    // Internal method to handle received messages - 已废弃，使用新的protobuf处理
    private onMessageReceived(event: MessageEvent) {
        console.log("Message received:", event.data);
        // 通知额外的监听器
        for (const listener of this.additionalListeners) {
            listener(event);
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
                    console.log("Sending message:", message);
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
            this.isOnlineMode = false;
            this.room_id = -1;
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
        return this.isOnlineMode;
    }
}

const BackendWS = new WebSocketClient();

export function HasConnected() {
    return BackendWS.hasConnected();
}

export { WebSocketClient };

export default BackendWS;