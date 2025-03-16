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
        let remaining = 2; // 需要放置的 TNT 数量，根据需求调整
        const usedRows = new Set<number>();
        const usedCols = new Set<number>();

        // 第一遍：寻找满足条件且行、列唯一的格子
        for (let col = this.game.GRID_COLS - 1; col >= 0 && remaining > 0; col--) {
            for (let row = 0; row < this.game.GRID_ROWS && remaining > 0; row++) {
                // 检查该格子是否满足放置 TNT 的条件
                const key = `${col}-${row}`;
                let canPlace = true;
                if (this.game.gardener.planted.has(key)) {
                    const list = this.game.gardener.planted.get(key);
                    if (list && list.length > 0) {
                        for (const plant of list) {
                            const pid = plant.pid;
                            // 允许存在 shield 或 Lily
                            if (!SHIELD_PLANT.includes(pid) && pid !== Lily.pid) {
                                canPlace = false;
                                break;
                            }
                        }
                    }
                }
                // 同时要求不在已放置 TNT 的行或列中
                if (canPlace && !usedRows.has(row) && !usedCols.has(col)) {
                    NewTnt(this.game, col, row, this.level);
                    remaining--;
                    usedRows.add(row);
                    usedCols.add(col);
                }
            }
        }

        // 第二遍：如果第一遍放置不足，则不再考虑行、列的唯一性限制
        if (remaining > 0) {
            for (let col = this.game.GRID_COLS - 1; col >= 0 && remaining > 0; col--) {
                for (let row = 0; row < this.game.GRID_ROWS && remaining > 0; row++) {
                    const key = `${col}-${row}`;
                    let canPlace = true;
                    if (this.game.gardener.planted.has(key)) {
                        const list = this.game.gardener.planted.get(key);
                        if (list && list.length > 0) {
                            for (const plant of list) {
                                const pid = plant.pid;
                                if (!SHIELD_PLANT.includes(pid) && pid !== Lily.pid) {
                                    canPlace = false;
                                    break;
                                }
                            }
                        }
                    }
                    if (canPlace) {
                        NewTnt(this.game, col, row, this.level);
                        remaining--;
                    }
                }
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
    description: i18n.S('tnt_description'),
    needFirstCoolDown: true
};

export default TntRecord;