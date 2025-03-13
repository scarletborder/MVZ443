// src/types/gameParams.ts

import { StageResult } from "./IRecord";

export interface GameParams {
    level: number; // 关卡号, 拼接字符串
    plants: Array<number>; // 携带的植物pids,获得植物的等级交给cardSlot做,种植runtime等级交给信号做
    difficulty?: 'easy' | 'normal' | 'hard'; // 可选难度（未来扩展）
    gameExit?: (result: StageResult) => void;
    setInitialEnergy?: (energy: number) => void;
    gameSettings?: GameSettings;
    [key: string]: any; // 允许动态扩展其他参数
}

export interface GameSettings {
    isBluePrint: boolean;
    isDebug: boolean;
}

export interface ChapterDescription {
    id: number;
    name: string;
    description: string;
    stages: Array<number>;
}

export interface StageDescription {
    id: number;
    chapterID: number;
    name: string;
    description: string;
};