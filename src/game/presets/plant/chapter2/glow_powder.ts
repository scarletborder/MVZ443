import { SECKILL } from "../../../../../public/constants";
import { item } from "../../../../components/shop/types";

import { GetDecValue, GetIncValue } from "../../../../utils/numbervalue";
import { IPlant } from "../../../models/IPlant";
import { IRecord } from "../../../models/IRecord";
import { IMonster } from "../../../models/monster/IMonster";
import { Game } from "../../../scenes/Game";

// glow stone powder

class GlowPowder extends IPlant {
    game: Game;
    damage: number;
    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, GlowPowderRecord.texture, GlowPowderRecord.pid, level);
        scene.physics.world.disable(this);

        this.game = scene;
        this.setHealthFirstly(SECKILL);
        this.createRects();

        // 立即唤醒同一格的所有器械
        const key = `${col}-${row}`;
        if (scene.gardener.planted.has(key)) {
            const list = scene.gardener.planted.get(key);
            if (list) {
                for (const plant of list) {
                    plant.setSleeping(false);
                }
            }
        }

        this.Timer = scene.frameTicker.delayedCall({
            delay: 300,
            callback: () => {
                this.destroyPlant();
            }
        })
    }

    public takeDamage(amount: number, monster: IMonster): void { }

    createRects() {
        const depth = this.baseDepth + 1;
        const centerX = this.x;      // 中心点 x 坐标
        const centerY = this.y - this.game.positionCalc.GRID_SIZEY / 2;      // 中心点 y 坐标
        const rangeWidth = this.game.positionCalc.GRID_SIZEX;   // 横向散布范围
        const rangeHeight = this.game.positionCalc.GRID_SIZEY;  // 纵向散布范围
        const rectWidth = this.game.positionCalc.GRID_SIZEX / 15;     // 小矩形宽度
        const rectHeight = this.game.positionCalc.GRID_SIZEX / 15;    // 小矩形高度
        const rectCount = 15;     // 矩形数量

        for (let i = 0; i < rectCount; i++) {
            // 在范围内随机生成小矩形的中心坐标
            let posX = Phaser.Math.Between(centerX - rangeWidth / 2, centerX + rangeWidth / 2);
            let posY = Phaser.Math.Between(centerY - rangeHeight / 2, centerY + rangeHeight / 2);

            // 创建图形对象并绘制蓝色矩形
            let graphics = this.game.add.graphics({ fillStyle: { color: 0xFFFF5A } }).setDepth(depth);
            graphics.fillRect(posX - rectWidth / 2, posY - rectHeight / 2, rectWidth, rectHeight);

            // 对每个矩形添加 Tween，使透明度在 400ms 内从 1 渐变到 0.2，然后销毁图形对象
            this.game.tweens.add({
                targets: graphics,
                alpha: 0.2,
                duration: 1600,
                ease: 'Linear',
                onComplete: () => {
                    graphics.destroy();
                }
            });
        }
    }

}

function NewMagicPowder(scene: Game, col: number, row: number, level: number): IPlant {
    const furnace = new GlowPowder(scene, col, row, level);
    return furnace;
}

function cost(level?: number): number {
    return 75;
}

function cooldownTime(level?: number): number {
    return GetDecValue(8, 0.6, level || 1);
}


const GlowPowderRecord: IRecord = {
    pid: 17,
    nameKey: 'name_glow_powder',
    cost: cost,
    cooldownTime: cooldownTime,
    NewFunction: NewMagicPowder,
    texture: 'plant/glow_powder',
    descriptionKey: 'glow_powder_description',
    needFirstCoolDown: true,

};

export default GlowPowderRecord;