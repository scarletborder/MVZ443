import { SECKILL } from "../../../../public/constants";
import { item } from "../../../components/shop/types";
import i18n from "../../../utils/i18n";
import { GetIncValue } from "../../../utils/numbervalue";
import { NewLaserByGrid } from "../../models/ILaser";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";

class IceBomb extends IPlant {
    game: Game;
    hasKill: boolean;
    damage: number = 5;
    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, IceBombRecord.texture, IceBombRecord.pid, level);
        this.game = scene;
        this.setHealthFirstly(SECKILL);
        this.hasKill = false;
        this.createRects();
        this.damage = GetIncValue(5, 10, level);
        if (level >= 5) {
            this.damage = 75;
        }

        // 发射大道隐藏激光
        for (let row = 0; row < this.game.positionCalc.Row_Number; row++) {
            const laser = NewLaserByGrid(this.game, -1, row, 12,
                this.damage, 'zombie', 90, {
                debuff: 'frozen',
                duration: 5000
            }, {
                invisible: true,
                color: 0x00ffff,
                alphaFrom: 0,
                alphaTo: 0
            }
            );
        }

        this.destroyPlant();

        scene.time.delayedCall(5010, () => {
            // 发射大道隐藏激光,slow
            for (let row = 0; row < this.game.positionCalc.Row_Number; row++) {
                const laser = NewLaserByGrid(this.game, -1, row, 12,
                    this.damage, 'zombie', 90, {
                    debuff: 'slow',
                    duration: 7000
                }, {
                    invisible: true,
                    color: 0x00ffff,
                    alphaFrom: 0,
                    alphaTo: 0
                }
                );
            }
        });


    }

    createRects() {
        const depth = this.baseDepth + 1;
        const centerX = this.x;      // 中心点 x 坐标
        const centerY = this.y - this.game.positionCalc.GRID_SIZEY / 2;      // 中心点 y 坐标
        const rangeWidth = this.game.positionCalc.GRID_SIZEX * 1.5;   // 横向散布范围
        const rangeHeight = this.game.positionCalc.GRID_SIZEY * 1.5;  // 纵向散布范围
        const rectWidth = this.game.positionCalc.GRID_SIZEX / 15;     // 小矩形宽度
        const rectHeight = this.game.positionCalc.GRID_SIZEX / 15;    // 小矩形高度
        const rectCount = 20;     // 矩形数量

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
                    if (this && this.health && this.health > 0) {
                        this.destroyPlant();
                    }
                }
            });
        }
    }

}

function NewIceBomb(scene: Game, col: number, row: number, level: number): IPlant {
    const furnace = new IceBomb(scene, col, row, level);
    return furnace;
}

function cost(level?: number): number {
    // if ((level || 1) >= 5) return 125;
    return 75;
}

function cooldownTime(level?: number): number {
    if ((level || 1) >= 9) return 41;
    return 52;
}

function levelAndstuff(level: number): item[] {
    return [{
        type: SECKILL,
        count: 1
    }];
    return [];
}

const IceBombRecord: IRecord = {
    pid: 12,
    name: '寒冰炸弹',
    cost: cost,
    cooldownTime: cooldownTime,
    NewFunction: NewIceBomb,
    texture: 'plant/ice_bomb',
    description: i18n.S('ice_bomb_description'),
    NextLevelStuff: levelAndstuff
};

export default IceBombRecord;