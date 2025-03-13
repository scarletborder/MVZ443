import QueueReceive from "../../game/utils/queue_receive";
import QueueSend from "../../game/utils/queue_send";

class WebSocketClient {
    private ws: WebSocket | null = null;
    private receiveQueue: QueueReceive | null = null;
    private sendQueue: QueueSend | null = null;
    public url: string = "";
    private additionalListeners: ((event: MessageEvent) => void)[] = [];
    public isConnected: boolean = false;

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
            const parsedMessage = JSON.parse(event.data);
            if (parsedMessage) {
                if (!parsedMessage.length) {
                    // 游戏外frame以object形式
                    this.receiveQueue.queues.push(parsedMessage);
                } else {
                    // 游戏内frame以array形式
                    for (const message of parsedMessage) {
                        this.receiveQueue?.queues.push(message);
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
                    this.ws.send(JSON.stringify(message));
                    console.log("Sent message:", message);
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

export default BackendWS;