// 为地图带来独特的设定
// 例如定期增加energy,定期减少energy

import { EventBus } from "../EventBus";
import { Game } from "../scenes/Game";
import { StageDataRecords } from "../utils/loader";

/**
 * 为关卡加入特殊的地图设定
 * 
 * 你甚至可以在这里修改wave,修改定时地图变更等
 * @param game 
 */
export default function AddMapFunction(game: Game) {
    const stageId = game.params.level; // stage id
    const chapterId = StageDataRecords[stageId].chapterID; // chapter id

    // dispatch stage or chapter
    if (chapterId === 1) {
        Chapter1Dispatch(game, stageId);
    }
}


function Chapter1Dispatch(game: Game, stageId: number) {
    // 第一章的
    const { width, height } = game.scale;
    // 白天
    if (stageId === 1 || stageId === 2) {
        // 每25s + 25 energy
        game.dayOrNight = true;
        game.time.addEvent({
            startAt: 15000,
            delay: 25000,
            callback: () => {
                EventBus.emit('energy-update', { energyChange: 25 });
            },
            loop: true
        });
    }

    if (stageId === 1) {
        game.handleCardPlant(1, 1, 0, 0, 9961);
        game.handleCardPlant(1, 1, 0, 4, 9961);
        game.handleCardPlant(2, 1, 1, 1, 9961);
        game.handleCardPlant(2, 1, 1, 2, 9961);
        game.handleCardPlant(2, 1, 1, 3, 9961);
    }

    if (stageId === 7) {
        game.handleCardPlant(2, 1, 1, 1, 9961);
        game.handleCardPlant(2, 1, 1, 2, 9961);
        game.handleCardPlant(2, 1, 1, 3, 9961);
    }

    if (stageId === 3 || stageId === 7) {
        // [0][7] = water
        game.dayOrNight = false;
        game.gridProperty[0][7] = 'water';
        const darkOverlay = game.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3).setDepth(2);
    }

    if (stageId === 4) {
        game.dayOrNight = false;
        const darkOverlay = game.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(2);
    }

    if (stageId === 5 || stageId === 8) {
        game.dayOrNight = false;
        const darkOverlay = game.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(2);
        // row:2, 3  = water
        for (let col = 0; col < game.GRID_COLS; col++) {
            game.gridProperty[2][col] = 'water';
            game.gridProperty[3][col] = 'water';
        }
    }

    if (stageId === 6 || stageId === 9) {
        game.dayOrNight = false;
        const darkOverlay = game.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(2);
        if (stageId === 9) {
            // 在stage 8 基础上,在第一个elite结束后沙砾和碎石砖块会消失变为sky

            // 切换地图为 `bg/bgRainbowCave2`

            // 开始定时能量恢复
        }

    }




    // 绘制阴影表格
    // stage1 黑色
    if (game.params.level === 1) {
        for (let row = 0; row < game.GRID_ROWS; row++) {
            // game.grid[row] = [];
            for (let col = 0; col < game.GRID_COLS; col++) {
                const { x, y } = game.positionCalc.getGridTopLeft(col, row);
                const rect = game.add.rectangle(x, y, game.positionCalc.GRID_SIZEX,
                    game.positionCalc.GRID_SIZEY, 0x000000, 0.12)
                    .setOrigin(0, 0).setDepth(3);
                rect.setStrokeStyle(1, 0xffffff, 0.1);
            }
        }
    }

    // stage 4,5 手动暗淡



}