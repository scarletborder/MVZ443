import seedrandom from "seedrandom";
import { SECKILL } from "../../../../public/constants";
import { item } from "../../../components/shop/types";
import i18n from "../../../utils/i18n";
import { GetDecValue } from "../../../utils/numbervalue";
import { IExpolsion } from "../../models/IExplosion";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { IZombie } from "../../models/IZombie";
import { Game } from "../../scenes/Game";
import { StartArc } from "../../utils/arc";

class _TntMines extends IPlant {
    game: Game;
    isBuried: boolean = true;
    random: seedrandom.PRNG;

    constructor(scene: Game, col: number, row: number, level: number, buriedTime: number) {
        super(scene, col, row, TntMines.texture, TntMines.pid, level);
        this.random = seedrandom.alea(String(scene.seed * 3));
        this.isBuried = true;
        this.game = scene;
        this.setFrame(0);
        this.setHealthFirstly(300);

        this.Timer = scene.time.addEvent({
            delay: buriedTime, // 出土时间
            loop: false,
            callback: () => {
                this.wakeup();
            },
            callbackScope: this,
        });
    }

    public onStarShards(): void {
        super.onStarShards();
        let leftCount = (this.level >= 7) ? 3 : 2;
        // 立刻出土
        this.wakeup();

        // 用于记录已经使用过的行和列
        const usedRows = new Set<number>();
        const usedCols = new Set<number>();

        // 第一遍：保证放置的 TNT Mines 分布在不同的行和列中
        for (let col = this.game.GRID_COLS - 1; col >= 0 && leftCount > 0; col--) {
            // 构造行号数组并随机打乱顺序
            const rows = Array.from({ length: this.game.GRID_ROWS }, (_, i) => i);
            rows.sort(() => this.random() - 0.5);

            for (const row of rows) {
                if (leftCount <= 0) break;
                const key = `${col}-${row}`;
                // 检查是否有植物占据该格子
                if (this.game.gardener.planted.has(key)) {
                    const list = this.game.gardener.planted.get(key);
                    if (list && list.length > 0) continue; // 该格子有植物
                }
                // 保证 TNT Mines 不在同一行或同一列
                if (usedRows.has(row) || usedCols.has(col)) continue;

                // 可以放置 TNT Mines

                const { x: tmpx, y: tmpy } = this.gardener.positionCalc.getPlantBottomCenter(col, row);
                StartArc(this.game, this.x, this.y, tmpx, tmpy, 'plant/tnt_mines', 1000, () => {
                    const newmine = NewTntMines(this.game, col, row, this.level);
                    newmine.wakeup();
                })


                leftCount--;
                usedRows.add(row);
                usedCols.add(col);
            }
        }

        // 第二遍：如果第一遍放置不足，则放宽行、列唯一性限制
        if (leftCount > 0) {
            for (let col = this.game.GRID_COLS - 1; col >= 0 && leftCount > 0; col--) {
                // 同样随机打乱行顺序
                const rows = Array.from({ length: this.game.GRID_ROWS }, (_, i) => i);
                rows.sort(() => this.random() - 0.5);

                for (const row of rows) {
                    if (leftCount <= 0) break;
                    const key = `${col}-${row}`;
                    if (this.game.gardener.planted.has(key)) {
                        const list = this.game.gardener.planted.get(key);
                        if (list && list.length > 0) continue; // 该格子有植物
                    }
                    const { x: tmpx, y: tmpy } = this.gardener.positionCalc.getPlantBottomCenter(col, row);
                    StartArc(this.game, this.x, this.y, tmpx, tmpy, 'plant/tnt_mines', 1000, () => {
                        const newmine = NewTntMines(this.game, col, row, this.level);
                        newmine.wakeup();
                    })

                    leftCount--;
                }
            }
        }
    }


    public wakeup(): void {
        if (this.health > 0 && this.isBuried) {
            this.setFrame(1);
            this.isBuried = false;
        }
    }

    public takeDamage(amount: number, zombie: IZombie): void {
        if (this.isBuried) {
            super.takeDamage(amount, zombie);
        } else {
            const rightDistance = this.level >= 9 ? 1.5 : 1;
            new IExpolsion(this.game, this.x, this.row, {
                damage: 2000,
                rightGrid: rightDistance,
                leftGrid: 0.5,
                upGrid: 0
            });
            this.destroyPlant();
        }
    }
}

function NewTntMines(scene: Game, col: number, row: number, level: number): _TntMines {
    const buriedTime = GetDecValue(16000, 0.8, level);
    const mine = new _TntMines(scene, col, row, level, buriedTime);
    return mine;
}

function cost(level?: number): number {
    return 25;
}

function cooldownTime(level?: number): number {
    if (level || 1 >= 5) return 25;
    return 30;
}


function levelAndstuff(level: number): item[] {
    switch (level) {
        case 1:
            return [{
                type: 1,
                count: 120
            }, {
                type: 3,
                count: 1
            }];
        case 2:
            return [{
                type: 1,
                count: 160
            }, {
                type: 2,
                count: 5
            }, {
                type: 3,
                count: 1
            }];
    }
    return [{
        type: SECKILL,
        count: 1
    }];
    return [];
}

const TntMines: IRecord = {
    pid: 4,
    name: 'TNT地雷',
    cost: cost,
    cooldownTime: cooldownTime,
    NewFunction: NewTntMines,
    texture: 'plant/tnt_mines',
    description: i18n.S('tnt_mines_description'),
    needFirstCoolDown: true,
    NextLevelStuff: levelAndstuff
};

export default TntMines;