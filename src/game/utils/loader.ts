// 根据所有给定的资源进行加载

import { ChapterDescription, StageDescription } from "../models/GameParams";
import { IRecord, MIRecord } from "../models/IRecord";
import * as PlantPresets from "../presets/plant";
import * as MonsterPresets from '../presets/zombie';

// 例如选择的植物pid,这里会进行加载资源,和将对应种植函数放到实例里面,map<number, function>

// 加载流程

export const PlantFactoryMap: Record<number, IRecord> = {
    1: PlantPresets.DispenserRecord,
    2: PlantPresets.FurnaceRecord,
    3: PlantPresets.ObsidianRecord,
    5: PlantPresets.SmallDispenserRecord,
}


export const MonsterFactoryMap: Record<number, MIRecord> = {
    1: MonsterPresets.zombieRecord,
    2: MonsterPresets.CapZombieRecord,
}


export const ChapterDataRecords: Record<number, ChapterDescription> = {
    1: { id: 1, name: '村庄', description: 'Steve与坑爹村民前往永夜沼泽后长久未回,Alex非常担心Steve...', stages: [1, 2] },
    // 2: { id: 2, name: 'Chapter 2', description: 'Intermediate challenge, moderate difficulty.', stages: [3, 4] },
    // 3: { id: 3, name: 'Chapter 3', description: 'Advanced chapter, test your strategy.', stages: [5] },
}

export const StageDataRecords: Record<number, StageDescription> = {
    1: { id: 1, name: '关卡 1-1', description: '简单入门关卡。' },
    2: { id: 2, name: '关卡 1-2', description: '稍微复杂一些。' },
    // 3: { id: 3, name: '关卡 2-1', description: '中级挑战。' },
    // 4: { id: 4, name: '关卡 2-2', description: '需要策略。' },
    // 5: { id: 5, name: '关卡 3-1', description: '高级关卡。' },
}