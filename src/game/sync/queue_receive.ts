import Denque from "denque";
import { Game } from "../scenes/Game";
import BackendWS from "../../utils/net/sync";
import encodeMessageToBinary from "../../utils/net/encode";
import { EventBus } from "../EventBus";

// 单人游戏
interface SingleParams {
    mode: 'single';

}

// 多人联机
interface MultiParams {
    mode: 'multi';
}

// 消息类型
export type _RoomInfo = {
    // 多人only,服务器告知你房间信息
    type: 0x00;
    roomID: number; // 目前无用
    lordID: number; // 房主的addr
    myID: number; // 我的id
    chapterId: number; // 当前章节
    peer: string[]; // 房间其他人的addr
}

export type _ChooseMap = {
    type: 0x10;
    chapterId: number;
}

export type _GameStart = {
    type: 0x01;
    seed: number;
    myID: number;
};

type _GameEnd = {
    type: 0x20;
    GameResult: number; // uint16
}

type _CardPlant = {
    type: 0x02;
    pid: number;
    level: number;
    col: number;
    row: number;
    uid: number; // 来源用户
    FrameID: number;
};

type _RemovePlant = {
    type: 0x04;
    pid: number;
    col: number;
    row: number;
    uid: number; // 来源用户
    FrameID: number;
}

type _UseStarShards = {
    type: 0x08;
    pid: number;
    col: number;
    row: number;
    uid: number; // 来源用户
    FrameID: number;
}

type _ResponseBlank = {
    type: 0x03;
    FrameID: number;
}

export type _receiveType = _GameStart | _CardPlant | _RemovePlant | _UseStarShards | _ResponseBlank | _GameEnd;

export type _Message =
    | _RoomInfo
    | _ChooseMap
    | _GameStart | _GameEnd
    | _ResponseBlank
    | _CardPlant | _RemovePlant | _UseStarShards;


/**
 * 将 Base64 字符串转换为 ArrayBuffer
 * @param base64 - Base64编码的字符串
 * @returns ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * 解码二进制消息，返回对应的消息对象
 * @param buffer ArrayBuffer 从服务器接收的数据
 */
export function decodeMessage(base64: string): _Message | null {
    const buffer = base64ToArrayBuffer(base64);
    const view = new DataView(buffer);
    const type = view.getUint8(0);
    let offset = 1;

    switch (type) {
        case 0x00: {
            // RoomInfo: roomID(uint16), lordID(uint16), myID(uint16), chapterId(uint16)
            const roomID = view.getUint16(offset);
            offset += 2;
            const lordID = view.getUint16(offset);
            offset += 2;
            const myID = view.getUint16(offset);
            offset += 2;
            const chapterId = view.getUint16(offset);
            offset += 2;
            // 接下来是 peer 数组：先读个数(uint8)，再循环读取每个字符串（长度 uint8 + 字节）
            const peerCount = view.getUint8(offset);
            offset += 1;
            const peer: string[] = [];
            const decoder = new TextDecoder();
            for (let i = 0; i < peerCount; i++) {
                const strLen = view.getUint8(offset);
                offset += 1;
                const strBytes = new Uint8Array(buffer, offset, strLen);
                const str = decoder.decode(strBytes);
                peer.push(str);
                offset += strLen;
            }
            return {
                type: 0x00,
                roomID,
                lordID,
                myID,
                chapterId,
                peer,
            };
        }
        case 0x01: {
            // GameStart: seed(int32) + myID(uint16)
            const seed = view.getInt32(offset);
            offset += 4;
            const myID = view.getUint16(offset);
            offset += 2;
            return {
                type: 0x01,
                seed,
                myID,
            };
        }
        case 0x02: {
            // CardPlant: frameID(uint16), pid(uint16), level(uint8), col(uint8), row(uint8), uid(uint16)
            const frameID = view.getUint16(offset);
            offset += 2;
            const pid = view.getUint16(offset);
            offset += 2;
            const level = view.getUint8(offset);
            offset += 1;
            const col = view.getUint8(offset);
            offset += 1;
            const row = view.getUint8(offset);
            offset += 1;
            const uid = view.getUint16(offset);
            offset += 2;
            return {
                type: 0x02,
                pid,
                level,
                col,
                row,
                uid,
                FrameID: frameID,
            };
        }
        case 0x03: {
            // Blank: frameID(uint16)
            const frameID = view.getUint16(offset);
            offset += 2;
            return {
                type: 0x03,
                FrameID: frameID,
            };
        }
        case 0x04: {
            // RemovePlant: frameID(uint16), pid(uint16), col(uint8), row(uint8), uid(uint16)
            const frameID = view.getUint16(offset);
            offset += 2;
            const pid = view.getUint16(offset);
            offset += 2;
            const col = view.getUint8(offset);
            offset += 1;
            const row = view.getUint8(offset);
            offset += 1;
            const uid = view.getUint16(offset);
            offset += 2;
            return {
                type: 0x04,
                pid,
                col,
                row,
                uid,
                FrameID: frameID,
            };
        }
        case 0x08: {
            // UseStarShards: frameID(uint16), pid(uint16), col(uint8), row(uint8), uid(uint16)
            const frameID = view.getUint16(offset);
            offset += 2;
            const pid = view.getUint16(offset);
            offset += 2;
            const col = view.getUint8(offset);
            offset += 1;
            const row = view.getUint8(offset);
            offset += 1;
            const uid = view.getUint16(offset);
            offset += 2;
            return {
                type: 0x08,
                pid,
                col,
                row,
                uid,
                FrameID: frameID,
            };
        }
        case 0x10: {
            // ChooseMap: chapterId(uint16)
            const chapterId = view.getUint16(offset);
            offset += 2;
            return {
                type: 0x10,
                chapterId,
            };
        }
        case 0x20: {
            // GameEnd : GameResult(uint16)
            const GameResult = view.getUint16(offset);
            offset += 2;
            return {
                type: 0x20,
                GameResult,
            };
        }
        default:
            console.error("Unknown message type:", type);
            return null;
    }
}


export default class QueueReceive {
    game: Game
    queues: Denque<_receiveType>
    // sync: Syncer | null = null

    myID: number = 0
    seed: number = 0

    // 多人游戏专用属性
    isHalted: boolean = false; // 是否halt 了game, 由于没有及时接收到下一个服务器帧

    constructor(params: SingleParams | MultiParams, game: Game) {
        this.game = game;
        this.queues = new Denque();
        if (params.mode == 'single') {
            // this.sync = null;
            // 单人游戏模拟发送一次服务器 blank, default = 1
            this.queues.push({
                type: 0x03,
                FrameID: 1,
            })

        } else {
            // 多人
            // this.sync = new Syncer();
        }
    }

    // 游戏每次update的入口位置直接调用,循环消费直到空
    Consume() {
        const executedList: (() => void)[] = [];

        // 先获得当前的帧ID
        const nextFrameID = 1 + BackendWS.GetFrameID();
        const tmpLeftFrames = []; // 存放未来frame的数据
        let hasExecuted = false;

        // console.log('expected frameID:', nextFrameID);

        // 消费队列
        while (!this.queues.isEmpty()) {
            const data = this.queues.shift();
            if (!data) continue;
            // console.log('receive data:', data);

            if (data.type === 0x20) {
                // 直接结束游戏
                const isWin = data.GameResult === 1 ? true : false;
                this.game.ExitEntry(isWin);
            }

            if ("FrameID" in data && data.FrameID > nextFrameID) {
                tmpLeftFrames.push(data);
                continue;
            }

            if ("FrameID" in data && data.FrameID < nextFrameID) {
                continue;
            }

            if ("FrameID" in data && data.FrameID === 2) {
                this.game.handleGameFrameStart(); // 刷怪开始
            }

            hasExecuted = true;
            switch (data.type) {
                case 0x01:
                    this._startGame(data.seed, data.myID);;
                    break;
                case 0x02:
                    executedList.push(() => { this._cardPlant(data.pid, data.col, data.row, data.level, data.uid); });
                    break;
                case 0x04:
                    executedList.push(() => { this._removePlant(data.pid, data.col, data.row, data.uid); });
                    break;
                case 0x08:
                    executedList.push(() => { this._useStarShards(data.pid, data.col, data.row, data.uid); });
                    break;
            }
        }

        if (tmpLeftFrames.length > 0) {
            // 将未来的帧数据重新放回队列
            for (const frame of tmpLeftFrames) {
                this.queues.push(frame);
            }
        }

        if (!hasExecuted) {
            // 如果本次没有接收到 下一个服务器帧没有接收到服务器的命令,那么暂停游戏,等待下一次服务器帧再次判断
            this._haltGame();
        } else {
            // 收到了 下一个服务器帧的命令,自增frameID,发送确认接收信息
            if (BackendWS.isConnected) {
                //TODO: 发送确认信息
                console.log('myid', this.myID)
                const encoded = encodeMessageToBinary({
                    type: 0x03,
                    FrameID: nextFrameID,
                    uid: this.myID
                }, nextFrameID);
                BackendWS.IncreaseFrameID();
                BackendWS.send(encoded);
            } else {
                // 单人游戏
                // 如果游戏没有暂停
                if (!this.game.time.paused) {
                    BackendWS.IncreaseFrameID();
                    // 单人游戏模拟发送一次服务器 blank
                    this.queues.push({
                        type: 0x03,
                        FrameID: nextFrameID + 1,
                    })
                } else {
                    // 如果游戏暂停了,那么不需要模拟发送blank
                    // 也不能让自己frameID自增,因为有私密图纸
                    return;
                }
            }

            this._resumeGame();
            // 该帧有效,帧驱动一些事件发生
            this.game.physics.world.update(this.game.frameTicker.getCurrentTime(), this.game.frameTicker.frameInterval);
            // 例如 plant发出子弹, 刷怪, 避免通过game.timer导致不精确
            this.game.frameTicker.update();
            EventBus.emit('timeFlow-set', { delta: this.game.frameTicker.frameInterval });
            executedList.forEach((func) => { func(); });
        }
    }

    private _startGame(seed: number, myID: number) {
        // TODO:在启动游戏主进程前,调用发送队列设置发送队列的myID
        console.log('game start', myID);
        this.myID = myID;
        this.game.handleGameStart(seed, myID);
    }
    private _cardPlant(pid: number, col: number, row: number, level: number, uid: number) {
        this.game.handleCardPlant(pid, level, col, row, uid);
    }
    private _removePlant(pid: number, col: number, row: number, uid: number) {
        this.game.handleRemovePlant(pid, col, row);
    }
    private _useStarShards(pid: number, col: number, row: number, uid: number) {
        this.game.handleStarShards(pid, col, row, uid);
    }

    // 由于接收不到服务器的命令,游戏暂停
    private _haltGame() {
        this.isHalted = true;
        this.game.doHalt();
    }
    private _resumeGame() {
        if (!this.isHalted) return;
        // 如果游戏因为没有接收到服务器的命令而暂停,那么恢复游戏
        // 现在只可能是多人游戏,因为单人游戏保证了queue必定有NextFrameID
        this.game.doResume();
        this.isHalted = false;
    }
}