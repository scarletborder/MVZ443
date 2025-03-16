import { SECKILL } from "../../../../public/constants";
import i18n from "../../../utils/i18n";
import { EventBus } from "../../EventBus";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { IZombie } from "../../models/IZombie";
import { Game } from "../../scenes/Game";

class MagicPowder extends IPlant {
    game: Game;
    hasKill: boolean;
    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, MagicPowderRecord.texture, MagicPowderRecord.pid, level);
        this.game = scene;
        this.setHealthFirstly(SECKILL);
        this.hasKill = false;
        this.createRects();
    }

    public takeDamage(amount: number, zombie?: IZombie | null): void {
        // 直接秒杀敌人(碰撞)
        if (zombie && !this.hasKill) {
            this.hasKill = true;
            zombie.takeDamage(2000, 'laser');
            this.destroyPlant();
            EventBus.emit('starshards-get');
        }
    }

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
                duration: 600,
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

function NewMagicPowder(scene: Game, col: number, row: number, level: number): IPlant {
    const furnace = new MagicPowder(scene, col, row, level);
    return furnace;
}

function cost(level?: number): number {
    return 175;
}

const MagicPowderRecord: IRecord = {
    pid: 10,
    name: '魔术粉',
    cost: cost,
    cooldownTime: () => 40,
    NewFunction: NewMagicPowder,
    texture: 'plant/magic_powder',
    description: i18n.S('magic_powder_description')
};

export default MagicPowderRecord;