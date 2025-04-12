import QueueReceive, { decodeMessage } from "../../game/sync/queue_receive";
import QueueSend from "../../game/sync/queue_send";
import encodeMessageToBinary from "./encode";

class WebSocketClient {
    private ws: WebSocket | null = null;
    private receiveQueue: QueueReceive | null = null;
    private sendQueue: QueueSend | null = null;
    public url: string = "";
    private additionalListeners: ((event: MessageEvent) => void)[] = [];
    public isConnected: boolean = false;

    public key: string = "";// 连接密钥

    public FrameID: number = 0; // 当前帧ID

    constructor() { }

    setQueue(receiveQueue: QueueReceive, sendQueue: QueueSend) {
        this.receiveQueue = receiveQueue;
        this.sendQueue = sendQueue;
    }

    public GetFrameID() {
        return this.FrameID;
    }

    public IncreaseFrameID() {
        ++this.FrameID;
    }

    // Method to set WebSocket server URL
    setConnectionUrl(url: string) {
        this.url = url;
    }

    // Method to establish a WebSocket connection
    startConnection() {
        console.log('try to link')
        if (this.isConnected) {
            console.error("WebSocket connection already established.");
            return;
        }
        if (!this.url) {
            console.error("WebSocket URL not set!");
            return;
        }

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log("WebSocket connection established.");
        };

        this.ws.onmessage = (event) => {
            if (!this.isConnected) {
                // 尚未正式确立关系
                const messageData = JSON.parse(event.data);
                if ("success" in messageData) {
                    if (messageData.success === true) {
                        this.isConnected = true;
                        const keyText = messageData.key === "" ? "公开" : `密钥=${messageData.key}`;
                        alert(`连接成功, 房间号=${messageData.room_id} ${keyText}`);
                    } else {
                        this.isConnected = false;
                        console.error("WebSocket connection failed:", messageData);
                        this.ws?.close();
                        this.ws = null;
                        alert('连接失败,请检查网络或服务器');
                        return;
                    }
                } else {
                    // 错误的返回,直接断开连接
                    console.error("WebSocket connection failed:", messageData);
                    this.isConnected = false;
                    this.ws?.close();
                    this.ws = null;
                    alert('连接失败,请检查网络或服务器');
                    return;
                }
            } else {
                // 正常游戏中
                this.onMessageReceived(event);
            }
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error: ", error);
        };

        this.ws.onclose = () => {
            console.log("WebSocket connection closed.");
            this.isConnected = false;
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

    // Internal method to handle received messages
    private onMessageReceived(event: MessageEvent) {
        if (event.data === '[]\n') return;
        console.log("Message received:", event.data);

        // Push the received message to the receive queue
        if (this.receiveQueue) {
            const vanillaMessage = JSON.parse(event.data);
            if (vanillaMessage) {
                if (!vanillaMessage.length) {
                    // 游戏外frame以object形式
                    this.receiveQueue.queues.push(vanillaMessage);
                } else {
                    // 游戏内frame以array形式
                    for (const message of vanillaMessage) {
                        const decodedMessage = decodeMessage(message);
                        console.log("Decoded message:", decodedMessage);
                        if (!decodedMessage) {
                            console.error("Failed to decode message:", message);
                            continue;
                        }
                        this.receiveQueue?.queues.push(decodedMessage);
                    }
                }
            }
        }

        // Notify additional listeners
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
                    const encoded = encodeMessageToBinary(message, this.FrameID);
                    this.ws.send(encoded.buffer); // 发送的是 ArrayBuffer
                    console.log("Sent binary message:", encoded);
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
            console.log("WebSocket connection closed.");
            this.isConnected = false;
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
        return this.isConnected;
    }
}

const BackendWS = new WebSocketClient();

export function HasConnected() {
    return BackendWS.hasConnected();
}

export default BackendWS;