// 根据所有给定的资源进行加载

import i18n from "../../utils/i18n";
import { ChapterDescription, StageDescription } from "../models/GameParams";


export const ChapterDataRecords: Record<number, ChapterDescription> = {
    1: { id: 1, name: '村庄', description: i18n.S('cp1'), stages: [1, 2, 3, 4, 5] },
    // 2: { id: 2, name: 'Chapter 2', description: 'Intermediate challenge, moderate difficulty.', stages: [3, 4] },
    // 3: { id: 3, name: 'Chapter 3', description: 'Advanced chapter, test your strategy.', stages: [5] },
}

export const StageDataRecords: Record<number, StageDescription> = {
    1: { id: 1, name: '安心村庄', description: i18n.S('sg1'), chapterID: 1 },
    2: { id: 2, name: '矿洞之外', description: i18n.S('sg2'), chapterID: 1 },
    3: { id: 3, name: '矿道', description: i18n.S('sg3'), chapterID: 1 },
    4: { id: 4, name: '矿洞深处', description: i18n.S('sg4'), chapterID: 1 },
    5: { id: 5, name: '矿洞深处(水)', description: i18n.S('sg5'), chapterID: 1 },
}