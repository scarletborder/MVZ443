import { SECKILL } from "../../../../public/constants";
import i18n from "../../../utils/i18n";
import { IExpolsion } from "../../models/IExplosion";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";
import { SHIELD_PLANT } from "../../utils/grid_clan";
import Lily from "./lily";

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
        let leftCount = 2;
        // 从第一排开始尝试放置准备好的炸弹
        for (let preCol = this.game.GRID_COLS - 1; preCol >= 0; preCol--) {
            for (let preRow = 0; preRow < this.game.GRID_ROWS; preRow++) {
                // 查看是否有位置(炸弹是排他的)
                const key = `${preCol}-${preRow}`;
                if (this.game.gardener.planted.has(key)) {
                    const list = this.game.gardener.planted.get(key);
                    if (list && list.length > 0) {
                        let couldPlant = true;
                        for (const plant of list) {
                            const pid = plant.pid;
                            // 可以有shield,承载物
                            if (SHIELD_PLANT.includes(pid) || pid === Lily.pid) continue; // 看来是可以的
                            // 其他的都不行
                            couldPlant = false;
                            break;
                        }

                        if (!couldPlant) continue; // 有植物
                    }
                }
                // 可以放置
                const newmine = NewTnt(this.game, preCol, preRow, this.level);
                leftCount--;
                if (leftCount === 0) return;
            }
        }
    }
}

function NewTnt(scene: Game, col: number, row: number, level: number): IPlant {
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
    NewFunction: NewTnt,
    texture: 'plant/tnt',
    description: i18n.S('tnt_description')
};

export default TntRecord;