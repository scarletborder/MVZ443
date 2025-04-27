import { item } from "../../components/shop/types";
import { StageScript } from "../game_events/stage_script";
import { Game } from "../scenes/Game";
import { IPlant } from "./IPlant";
import { IMonster } from "./monster/IMonster";

// plant
export interface IRecord {
    pid: number;
    nameKey: string;
    descriptionKey: string; // 图鉴描述

    cooldownTime: ((level?: number) => number);
    cost: ((level?: number) => number);
    NewFunction: (scene: Game, col: number, row: number, level: number) => IPlant;
    texture: string; // 也用于加载
    needFirstCoolDown?: boolean; // 是否需要第一次冷却
    /**
     * 传入当前等级,升级到level+1需要的材料
     * @param level 当前等级
     * @returns 物品列表
     */
}


export interface MIRecord {
    mid: number;
    name: string;
    NewFunction: (Game: Game, col: number, row: number, waveID: number) => IMonster;
    texture: string; // placeholder
    brief?: () => string;
    description?: () => string;

    // 用于出怪
    weight: (waveId?: number) => number; // 权重
    level: number;  // 权限等级
    leastWaveID: number; // 最早出现的waveID

    // 最早出现的waveID, 通过关卡ID来判断, 主要用于后期关卡增大难度
    // 如果无,fallback到leastWaveID
    leastWaveIDByStageID?: (stageID: number) => number;
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
    isFlag: boolean; // 是否是normal flag,用于触发字幕和多一些冷却时间
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

// 关卡结束需要返回的东西
export interface StageResult {
    isWin: boolean;
    onWin: OnWin;
    rewards: ProgressReward[];
    progress: number;
}

export interface preloadData {
    bgimg: string[]; // 背景图片
    bgm: string[]; // 背景音乐
    plants?: number[]; // 器械
}

// 通过json文件加载的关卡数据
export interface StageData {
    rows: number; // 行数
    type: number; // 地图材质,如平原图,矿洞图等,影响贴图和地图特性
    stageScript: StageScript; // stage script
    onWin: OnWin; // 胜利后解锁
    energy: number; // 初始能量
    // 进度奖励
    rewards: ProgressReward[];
    // 需要加载的数据
    load: preloadData;
}