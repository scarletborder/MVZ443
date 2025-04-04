import Denque from "denque";
import { Game } from "../scenes/Game";

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

export type _Message =
    | _RoomInfo
    | _ChooseMap
    | _GameStart
    | _CardPlant
    | _RemovePlant
    | _UseStarShards;


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
            // CardPlant: pid(uint16), level(uint8), col(uint8), row(uint8), uid(uint16)
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
            };
        }
        case 0x04: {
            // RemovePlant: pid(uint16), col(uint8), row(uint8), uid(uint16)
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
            };
        }
        case 0x08: {
            // UseStarShards: pid(uint16), col(uint8), row(uint8), uid(uint16)
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

    constructor(params: SingleParams | MultiParams, game: Game) {
        this.game = game;
        this.queues = new Denque();
        if (params.mode == 'single') {
            // this.sync = null;
        } else {
            // 多人
            // this.sync = new Syncer();
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
        console.log('game start')
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
}