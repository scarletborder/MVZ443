// 根据所有给定的资源进行加载

import { ChapterDescription, StageDescription } from "../models/GameParams";

import chapterData from "../../constants/dramas/cp1.json"

// 定义 StageDataRecords 和 ChapterDataRecords 作为动态加载的记录
export const ChapterDataRecords: Record<number, ChapterDescription> = {};
export const StageDataRecords: Record<number, StageDescription> = {};

chapterData.forEach((chapter: any) => {
    const chapterId = chapter.id;
    ChapterDataRecords[chapterId] = {
        id: chapterId,
        nameKey: chapter.name,
        descriptionKey: chapter.description,
        stages: []
    };

    // 为每个章节加载关卡
    chapter.stages.forEach((stage: any) => {
        const stageId = stage.id;
        StageDataRecords[stageId] = {
            id: stageId,
            nameKey: stage.name,
            descriptionKey: stage.description,
            chapterID: chapterId,
            illustration: stage.illustration
        };

        // 将关卡ID添加到对应章节的 stages 列表中
        ChapterDataRecords[chapterId].stages.push(stageId);
    });
});

// 添加新关卡需要同时在ChapterDataRecords和StageDataRecords中添加