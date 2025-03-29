import { SECKILL } from "../../../../public/constants";
import { item } from "../../../components/shop/types";
import i18n from "../../../utils/i18n";
import { GetIncValue } from "../../../utils/numbervalue";
import { EventBus } from "../../EventBus";
import { NewLaserByGrid } from "../../models/ILaser";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { IMonster } from "../../models/monster/IMonster";
import { Game } from "../../scenes/Game";

class MagicPowder extends IPlant {
    game: Game;
    damage: number;
    hasGotStarShards: boolean = false;
    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, MagicPowderRecord.texture, MagicPowderRecord.pid, level);
        this.game = scene;
        this.hasGotStarShards = false;
        this.setHealthFirstly(SECKILL);
        this.createRects();
        this.damage = GetIncValue(1500, 1.3, level);

        // 立刻创建一道激光
        NewLaserByGrid(scene, col - 0.6, row, 1.3, this.damage, 'zombie', 200, { toSky: true },
            { invisible: true, color: 0, alphaFrom: 0.2, alphaTo: 0.1 });

        scene.time.delayedCall(400, () => {
            EventBus.emit('starshards-get');
            this.destroyPlant();
        });
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
            let graphics = this.game.add.graphics({ fillStyle: { color: 0x0265b6 } }).setDepth(depth);
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
    const furnace = new MagicPowder(scene, col, row, level);
    return furnace;
}

function cost(level?: number): number {
    if ((level || 1) >= 5) return 125;
    return 175;
}

function cooldownTime(level?: number): number {
    if ((level || 1) >= 9) return 42;
    return 50;
}

function levelAndstuff(level: number): item[] {
    switch (level) {
        case 1:
            return [{
                type: 1,
                count: 200
            }, {
                type: 3,
                count: 2
            }];
    }
    return [{
        type: SECKILL,
        count: 1
    }];
    return [];
}

const MagicPowderRecord: IRecord = {
    pid: 10,
    name: '魔术粉',
    cost: cost,
    cooldownTime: cooldownTime,
    NewFunction: NewMagicPowder,
    texture: 'plant/magic_powder',
    description: i18n.S('magic_powder_description'),
    needFirstCoolDown: false,
    NextLevelStuff: levelAndstuff
};

export default MagicPowderRecord;