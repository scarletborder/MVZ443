// 为地图带来独特的设定
// 例如定期增加energy,定期减少energy

import { EventBus } from "../EventBus";
import { Game } from "../scenes/Game";
import { StageDataRecords } from "../utils/loader";

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
        // 每30s + 25 energy
        game.dayOrNight = true;
        game.time.addEvent({
            delay: 30000,
            callback: () => {
                EventBus.emit('energy-update', { energyChange: 25 });
            },
            loop: true
        });
    }

    if (stageId === 3) {
        // [0][7] = water
        game.dayOrNight = false;
        game.gridProperty[0][7] = 'water';
        const darkOverlay = game.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3).setDepth(2);
    }

    if (stageId === 4) {
        game.dayOrNight = false;
        const darkOverlay = game.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(2);
    }

    if (stageId === 5) {
        game.dayOrNight = false;
        const darkOverlay = game.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(2);
        // row:2, 3  = water
        for (let col = 0; col < game.GRID_COLS; col++) {
            game.gridProperty[2][col] = 'water';
            game.gridProperty[3][col] = 'water';
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