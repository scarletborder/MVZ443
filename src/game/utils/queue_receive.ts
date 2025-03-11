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
    type: 0x1;
    seed: number;
    myID: number;
};

type _CardPlant = {
    type: 0x2;
    pid: number;
    level: number;
    col: number;
    row: number;
    uid: number; // 来源用户
};

type _RemovePlant = {
    type: 0x4;
    pid: number;
    col: number;
    row: number;
    uid: number; // 来源用户
}






export default class QueueReceive {
    game: Game
    queues: Denque<_GameStart | _CardPlant | _RemovePlant>
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
                case 0x1:
                    this.game.handleGameStart(data.seed, data.myID);
                    break;
                case 0x2:
                    this.game.handleCardPlant(data.pid, data.level, data.col, data.row, data.uid);
                    break;
                case 0x4:
                    this.game.RemovePlant(data.pid, data.col, data.row);
                    break;
            }

        }
    }

    private _startGame(seed: number, myID: number) { }
    private _cardPlant(pid: number, col: number, row: number) { }
    private _removePlant(pid: number, col: number, row: number) { }
}