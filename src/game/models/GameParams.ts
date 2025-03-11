// src/types/gameParams.ts
interface plantProp {
    pid: number;
    level: number;
};

export interface GameParams {
    level: number; // 关卡号
    plants: Array<plantProp>; // 携带的植物
    difficulty?: 'easy' | 'normal' | 'hard'; // 可选难度（未来扩展）
    playerName?: string; // 可选玩家名（未来扩展）
    randomSeed?: number; // 随机种子
    gameExit: () => void;
    [key: string]: any; // 允许动态扩展其他参数
}

export interface ChapterData {
    id: number;
    name: string;
    description: string;
    stages: Array<number>;
}

export interface StageData {
    id: number;
    name: string;
    description: string;
};