import Denque from "denque";
import { _receiveType } from "./queue_receive";
import BackendWS from "../../utils/net/sync";

// 单人游戏
interface SingleParams {
    mode: 'single';
    recvQueue: Denque; // 单人游戏中先初始化接收队列
}

// 多人联机
interface MultiParams {
    mode: 'multi';

}

// 消息类型
type _requestJoin = {
    // 多人only,加入房间
    type: 0x00;
    roomID: number;
}

type _requestChooseMap = {
    type: 0x10;
    chapterId: number;
}

// 选卡结束,游戏外的准备
type _requestStartGame = {
    type: 0x20;
}

// 加载结束,游戏内的准备
type _ready = {
    type: 0x01;
    uid: number; // 来源用户
}

type _requestCardPlant = {
    type: 0x02;
    pid: number;
    level: number;
    col: number;
    row: number;
    uid: number; // 来源
}

type _requestRemovePlant = {
    type: 0x04;
    pid: number;
    col: number;
    row: number;
    uid: number; // 来源用户
}

type _requestStarShards = {
    type: 0x08;
    pid: number;
    col: number;
    row: number;
    uid: number; // 来源用户
}

type _requestType = _requestCardPlant | _requestRemovePlant | _requestStarShards | _ready;

export default class QueueSend {
    queues: Denque<_requestType>
    singRecvQueue: Denque<_receiveType> | null = null// 仅singlePlayer,接收队列
    myID: number = 0

    constructor(params: SingleParams | MultiParams) {
        this.queues = new Denque();
        if (params.mode == 'single') {
            this.singRecvQueue = params.recvQueue;
        } else {
            // 多人
            this.singRecvQueue = null
        }
    }

    // 立即的方法,设置本myId
    setMyID(myID: number) {
        this.myID = myID;
    }

    Consume() {
        // 如果是单人游戏,则直接将数据放入接收队列
        if (this.singRecvQueue) {
            while (!this.queues.isEmpty()) {
                const data = this.queues.shift();
                if (!data) continue;
                this.dispatchSingle(data);
            }
        }
        // 多人游戏
        else if (BackendWS.isConnected) {
            // 直接发送数据到服务器
            BackendWS.consumeSendQueue();
        }
    }

    private dispatchSingle(data: _requestType) {
        if (data.type === 0x01) {
            // ready
            this.singRecvQueue?.push({
                type: 0x01,
                seed: Math.random(),
                myID: this.myID
            });
        } else {
            this.singRecvQueue?.push(data);
        }
    }

    // 外部调用发送消息
    public sendReady() {
        this.queues.push({
            type: 0x01,
            uid: this.myID,
        });
    }

    public sendCardPlant(pid: number, col: number, row: number, level: number) {
        this.queues.push({
            type: 0x02,
            pid: pid,
            col: col,
            row: row,
            level: level,
            uid: this.myID,
        });
    }

    public sendRemovePlant(pid: number, col: number, row: number) {
        this.queues.push({
            type: 0x04,
            pid: pid,
            col: col,
            row: row,
            uid: this.myID,
        });
    }

    public sendStarShards(pid: number, col: number, row: number) {
        this.queues.push({
            type: 0x08,
            pid: pid,
            col: col,
            row: row,
            uid: this.myID,
        });
    }

}