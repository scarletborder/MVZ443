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
    brief?: string; // 游戏内卡片描述
    description: string; // 图鉴描述
}


// monster
export interface MIRecord {
    mid: number;
    name: string;
    NewFunction: (Game: Game, x: number, y: number) => IZombie;
    texture: string;
    brief?: string;
    description?: string;
}