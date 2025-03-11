import Denque from "denque";
import { Game } from "../scenes/Game";
import Syncer from "../../utils/net/sync";

// 单人游戏
interface SingleParams {
    mode: 'single';

}

// 多人联机
interface MultiParams {
    mode: 'multi';
}

// 消息类型
type _GameStart = {
    type: 0x01;
    seed: number;
    myID: number;
};

type _CardPlant = {
    type: 0x02;
    pid: number;
    level: number;
    col: number;
    row: number;
    uid: number; // 来源用户
};

type _RemovePlant = {
    type: 0x04;
    pid: number;
    col: number;
    row: number;
    uid: number; // 来源用户
}

type _UseStarShards = {
    type: 0x08;
    pid: number;
    col: number;
    row: number;
    uid: number; // 来源用户
}

export type _receiveType = _GameStart | _CardPlant | _RemovePlant | _UseStarShards;


export default class QueueReceive {
    game: Game
    queues: Denque<_receiveType>
    sync: Syncer | null = null

    myID: number = 0
    seed: number = 0

    constructor(params: SingleParams | MultiParams, game: Game) {
        this.game = game;
        this.queues = new Denque();
        if (params.mode == 'single') {
            this.sync = null;
        } else {
            // 多人
            this.sync = new Syncer();
        }
    }

    // 游戏每次update的入口位置直接调用,循环消费直到空
    Consume() {
        while (!this.queues.isEmpty()) {
            const data = this.queues.shift();
            if (!data) continue;

            switch (data.type) {
                case 0x01:
                    this._startGame(data.seed, data.myID);
                    break;
                case 0x02:
                    this._cardPlant(data.pid, data.col, data.row, data.level, data.uid);
                    break;
                case 0x04:
                    this._removePlant(data.pid, data.col, data.row, data.uid);
                    break;
                case 0x08:
                    this._useStarShards(data.pid, data.col, data.row, data.uid);
                    break;
            }

        }
    }

    private _startGame(seed: number, myID: number) {
        // TODO:在启动游戏主进程前,调用发送队列设置发送队列的myID
        this.game.handleGameStart(seed, myID);
    }
    private _cardPlant(pid: number, col: number, row: number, level: number, uid: number) {
        this.game.handleCardPlant(pid, level, col, row, uid);
    }
    private _removePlant(pid: number, col: number, row: number, uid: number) {
        // this.game.handleRemovePlant(pid, col, row);
    }
    private _useStarShards(pid: number, col: number, row: number, uid: number) {
        // this.game.handleUseStarShards(pid, col, row, uid);
    }
}