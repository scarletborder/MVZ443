import { Game } from "../scenes/Game";
import { IZombie } from "./IZombie";

// plant
export interface IRecord {
    pid: number;
    name: string;
    cooldownTime: number;
    cost: number;
    NewFunction: Function;
    texture: string; // 也用于加载
    brief?: string; // 游戏内卡片描述
    description: string; // 图鉴描述
};


// monster
export interface MIRecord {
    mid: number;
    name: string;
    NewFunction: (Game: Game, x: number, y: number) => IZombie;
    texture: string;
    brief?: string;
    description?: string;
}