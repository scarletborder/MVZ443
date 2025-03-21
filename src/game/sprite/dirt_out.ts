// 破土而出的动画

import DepthManager from "../../utils/depth";
import { Game } from "../scenes/Game";

export default function createDirtOut(scene: Game, col: number, row: number,
    callback: () => void, size?: { sizeX: number, sizeY: number }) {
    if (!scene || !scene.anims) return;

    if (!scene.anims.exists('anime/dirt_out')) {
        scene.anims.create({
            key: 'anime/dirt_out',
            frames: scene.anims.generateFrameNumbers('anime/dirt_out', { start: 0, end: 5 }),
            frameRate: 12,
            repeat: 0,
        })
    }
    if (!size) size = scene.positionCalc.getPlantBodySize();

    const { x, y } = scene.positionCalc.getPlantBottomCenter(col, row);
    const dirt_obj = scene.add.sprite(x, y, 'anime/dirt_out', 0).setDepth(DepthManager.getPlantBasicDepth(row));
    dirt_obj.setDisplaySize(size.sizeX, size.sizeY);
    dirt_obj.setOrigin(0.5, 1).setVisible(true);
    dirt_obj.anims.play('anime/dirt_out');
    dirt_obj.once('animationcomplete', () => {
        dirt_obj.destroy();
        callback();
    });
}