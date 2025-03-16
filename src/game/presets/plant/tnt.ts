import { SECKILL } from "../../../../public/constants";
import i18n from "../../../utils/i18n";
import { IExpolsion } from "../../models/IExplosion";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";

class _Tnt extends IPlant {
    game: Game;

    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, TntRecord.texture, TntRecord.pid, level);
        this.game = scene;
        this.setHealthFirstly(SECKILL);

        // 设定闪烁效果，并添加回调函数
        scene.tweens.add({
            targets: this,
            alpha: { from: 1, to: 0.2 },  // 从原状态到白色高光
            duration: 300,                // 每次闪烁的时长
            yoyo: true,                   // 使得动画完成后反向播放
            repeat: 3,                    // 重复5次（从原状态到高光，再回来，总共3次）
            ease: 'Sine.easeInOut',       // 缓动效果
            onComplete: () => {           // 动画完成后触发的回调函数
                this.destroyPlant();
                new IExpolsion(this.game, this.x, this.row, {
                    damage: 3000,
                    rightGrid: 1.5,
                    leftGrid: 1.5,
                    upGrid: 1
                })
                // 你可以在这里调用其他的函数或者执行额外的逻辑
            }
        });
    }
    public onStarShards(): void {
        super.onStarShards();
    }
}

function NewTntMines(scene: Game, col: number, row: number, level: number): IPlant {
    const furnace = new _Tnt(scene, col, row, level);
    return furnace;
}

function cost(level?: number): number {
    return 150;
}

const TntRecord: IRecord = {
    pid: 7,
    name: '瞬炸TNT',
    cost: cost,
    cooldownTime: () => 30,
    NewFunction: NewTntMines,
    texture: 'plant/tnt',
    description: i18n.S('tnt_description')
};

export default TntRecord;