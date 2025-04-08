import QueueReceive, { decodeMessage } from "../../game/utils/queue_receive";
import QueueSend from "../../game/utils/queue_send";


export function encodeMessageToBinary(message: _requestType, frameID: number): Uint8Array {
    const buffer = new ArrayBuffer(16); // 固定长度
    const view = new DataView(buffer);

    view.setUint8(0, message.type);

    // 通用字段
    if ('uid' in message) view.setUint16(1, message.uid);

    // 针对不同类型结构
    switch (message.type) {
        case 0x02: // Plant
            view.setUint16(3, message.pid);
            view.setUint8(5, message.level);
            view.setUint8(6, message.col);
            view.setUint8(7, message.row);
            view.setUint16(8, frameID);
            break;

        case 0x04: // Remove
        case 0x08: // StarShard
            view.setUint16(3, message.pid);
            view.setUint8(6, message.col);
            view.setUint8(7, message.row);
            view.setUint16(8, frameID);
            break;

        case 0x01: // Ready
            // already handled uid
            break;
        case 0x10:
            view.setUint32(3, message.chapterId);
            break;
    }

    return new Uint8Array(buffer);
}


class WebSocketClient {
    private ws: WebSocket | null = null;
    private receiveQueue: QueueReceive | null = null;
    private sendQueue: QueueSend | null = null;
    public url: string = "";
    private additionalListeners: ((event: MessageEvent) => void)[] = [];
    public isConnected: boolean = false;

    public FrameID: number = 0; // 当前帧ID

    constructor() { }

    setQueue(receiveQueue: QueueReceive, sendQueue: QueueSend) {
        this.receiveQueue = receiveQueue;
        this.sendQueue = sendQueue;
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
            this.isConnected = true;
            alert('连接成功');
        };

        this.ws.onmessage = (event) => {
            this.onMessageReceived(event);
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