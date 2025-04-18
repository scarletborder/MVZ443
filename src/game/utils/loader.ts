// 根据所有给定的资源进行加载

import i18n from "../../utils/i18n";
import { ChapterDescription, StageDescription } from "../models/GameParams";

import chapterData from "../../constants/dramas/cp1.json"

// 定义 StageDataRecords 和 ChapterDataRecords 作为动态加载的记录
export const ChapterDataRecords: Record<number, ChapterDescription> = {};
export const StageDataRecords: Record<number, StageDescription> = {};

chapterData.forEach((chapter: any) => {
    const chapterId = chapter.id;
    ChapterDataRecords[chapterId] = {
        id: chapterId,
        name: chapter.name,
        description: i18n.S(chapter.description), // 使用 i18n 来处理描述
        stages: []
    };

    // 为每个章节加载关卡
    chapter.stages.forEach((stage: any) => {
        const stageId = stage.id;
        StageDataRecords[stageId] = {
            id: stageId,
            name: stage.name,
            description: i18n.S(stage.description), // 使用 i18n 来处理描述
            chapterID: chapterId,
            illustration: stage.illustration
        };

        // 将关卡ID添加到对应章节的 stages 列表中
        ChapterDataRecords[chapterId].stages.push(stageId);
    });
});
// export const ChapterDataRecords: Record<number, ChapterDescription> = {
//     1: { id: 1, name: '村庄之下', description: i18n.S('cp1'), stages: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
//     // 2: { id: 2, name: 'Chapter 2', description: 'Intermediate challenge, moderate difficulty.', stages: [3, 4] },
//     // 3: { id: 3, name: 'Chapter 3', description: 'Advanced chapter, test your strategy.', stages: [5] },
// }

// export const StageDataRecords: Record<number, StageDescription> = {
//     1: { id: 1, name: '安心村庄', description: i18n.S('sg1'), chapterID: 1 },
//     2: { id: 2, name: '矿洞之外', description: i18n.S('sg2'), chapterID: 1 },
//     3: { id: 3, name: '矿道', description: i18n.S('sg3'), chapterID: 1 },
//     4: { id: 4, name: '矿洞深处', description: i18n.S('sg4'), chapterID: 1 },
//     5: { id: 5, name: '矿洞深处(水)', description: i18n.S('sg5'), chapterID: 1 },
//     6: { id: 6, name: '虹龙洞', description: i18n.S('sg6'), chapterID: 1 },
//     7: { id: 7, name: '矿道(elite)', description: i18n.S('sg7'), chapterID: 1 },
//     8: { id: 8, name: '矿洞深处(水elite)', description: i18n.S('sg8'), chapterID: 1 },
//     9: { id: 9, name: '虹龙洞(BOSS)', description: i18n.S('sg9'), chapterID: 1 },
// }

// 添加新关卡需要同时在ChapterDataRecords和StageDataRecords中添加