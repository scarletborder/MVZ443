import { item } from "../../components/shop/types";
import { Game } from "../scenes/Game";
import { IPlant } from "./IPlant";
import { IZombie } from "./IZombie";

// plant
export interface IRecord {
    pid: number;
    name: string;
    cooldownTime: ((level?: number) => number);
    cost: ((level?: number) => number);
    NewFunction: (scene: Game, col: number, row: number, level: number) => IPlant;
    texture: string; // 也用于加载
    brief?: () => string; // 游戏内卡片描述
    description: () => string; // 图鉴描述
    needFirstCoolDown?: boolean; // 是否需要第一次冷却
    NextLevelStuff: (level: number) => item[],
}


// monster
export interface MIRecord {
    mid: number;
    name: string;
    NewFunction: (Game: Game, x: number, y: number) => IZombie;
    texture: string;
    brief?: () => string;
    description?: () => string;
}


// stage 关卡
export interface Monster {
    mid: number;
    count: number;
}

export interface Wave {
    waveId: number;
    progress: number; // 进度,一般非常小,同时可以被重置,游戏结束不看这个,只是显示用
    flag: string; // flag 类型,用于标记特殊的wave,如 `normal | elite | boss`
    // 对于一些做精英怪的前期BOSS,初始化的时候带上isFinalBoss来控制死亡时是否触发胜利

    monsters: Monster[];
    duration: number; // seconds
    maxDelay: number; // seconds
    minDelay: number; // seconds
    arrangement: 0x01 | 0x02 // 0x01: 均匀, 0x02: 集中
    minLine: number; // 指定最少有多少行应该生成怪物，避免怪物过于集中在一行。
    exceptLine: number[]; // 指定不生成怪物的行数
    starShards: number; // 携带星屑数量
}


export interface Reward {
    type: number,
    count: number
}

export interface ProgressReward {
    progress: number;
    reward: Reward;
}

export interface OnWin {
    unLock: number[]; // 解锁的关卡
    unLockPlant: number[]; // 解锁的器械
}

export interface StageData {
    rows: number; // 行数
    type: number; // 地图材质,如平原图,矿洞图等,影响贴图和地图特性
    waves: Wave[];
    onWin: OnWin; // 胜利后解锁
    energy: number; // 初始能量
    // 进度奖励
    rewards: ProgressReward[];
}

// 关卡结束需要返回的东西
export interface StageResult {
    isWin: boolean;
    onWin: OnWin;
    rewards: ProgressReward[];
    progress: number;
}