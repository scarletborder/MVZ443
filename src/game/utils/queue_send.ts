import Denque from "denque";

interface SingleParams {
    mode: 'single';
    recvQueue: Denque; // 单人游戏中先初始化接收队列

}

// 多人联机
interface MultiParams {
    mode: 'multi';

}



export default class QueueSend {
    queues: Denque
    singRecvQueue: Denque | null = null// 仅singlePlayer,接收队列

    constructor(params: SingleParams | MultiParams) {
        this.queues = new Denque();
        if (params.mode == 'single') {
            this.singRecvQueue = params.recvQueue;
        } else {
            // 多人
            this.singRecvQueue = null
        }
    }
}