import { Game } from "../scenes/Game";
import { IPlant } from "./IPlant";
import { IZombie } from "./IZombie";

// plant
export interface IRecord {
    pid: number;
    name: string;
    cooldownTime: number;
    cost: ((level?: number) => number);
    NewFunction: (scene: Game, col: number, row: number, level: number) => IPlant;
    texture: string; // 也用于加载
    brief?: () => string; // 游戏内卡片描述
    description: () => string; // 图鉴描述
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
    flag: string;
    monsters: Monster[];
    duration: number; // seconds
    maxDelay: number; // seconds
    minDelay: number; // seconds
    arrangement: 0x01 | 0x02 // 0x01: 均匀, 0x02: 集中
    minLine: number; // 指定最少有多少行应该生成怪物，避免怪物过于集中在一行。
}

export interface StageData {
    rows: number; // 行数
    type: number; // 地图类型,如平原图,矿洞图等
    waves: Wave[];
}

