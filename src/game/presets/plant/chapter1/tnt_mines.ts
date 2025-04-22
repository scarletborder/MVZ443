import seedrandom from "seedrandom";
import { SECKILL } from "../../../../../public/constants";
import { item } from "../../../../components/shop/types";
import i18n from "../../../../utils/i18n";
import { GetDecValue } from "../../../../utils/numbervalue";
import { IExpolsion } from "../../../models/IExplosion";
import { IPlant } from "../../../models/IPlant";
import { IRecord } from "../../../models/IRecord";
import { Game } from "../../../scenes/Game";
import { StartArc } from "../../../utils/arc";
import createDirtOut from "../../../sprite/dirt_out";
import { IMonster } from "../../../models/monster/IMonster";

class _TntMines extends IPlant {
    game: Game;
    isBuried: boolean = true;
    head: Phaser.GameObjects.Sprite;
    random: seedrandom.PRNG;

    constructor(scene: Game, col: number, row: number, level: number, buriedTime: number) {
        super(scene, col, row, TntMines.texture, TntMines.pid, level);
        this.random = seedrandom.alea(String(scene.seed * 3));
        this.isBuried = true;
        this.plant_height = 1;
        this.game = scene;
        this.setFrame(0);

        const size = scene.positionCalc.getPlantDisplaySize();
        this.setVisible(false);
        this.head = scene.add.sprite(this.x, this.y, 'anime/dirt_out', 0).setOrigin(0.5, 1)
            .setDisplaySize(size.sizeX, size.sizeY).setDepth(this.depth);
        this.setHealthFirstly(400);

        this.Timer = scene.frameTicker.addEvent({
            delay: buriedTime, // 出土时间
            loop: false,
            callback: () => {
                this.wakeup();
            },
        });
    }

    public onStarShards(): void {
        super.onStarShards();
        if (!this.game) return;

        const scene = this.game;
        let leftCount = (this.level >= 7) ? 3 : 2;
        // 立刻出土
        this.wakeup();

        // 记录目标位置
        const targetPositions: { x: number, y: number, col: number, row: number }[] = [];
        // 用于记录已经使用过的行和列
        const usedRows = new Set<number>();
        const usedCols = new Set<number>();

        // 第一遍：保证放置的 TNT Mines 分布在不同的行和列中
        for (let col = scene.GRID_COLS - 1; col >= 0 && leftCount > 0; col--) {
            // 构造行号数组并随机打乱顺序
            const rows = Array.from({ length: this.game.GRID_ROWS }, (_, i) => i);
            rows.sort(() => this.random() - 0.5);

            for (const row of rows) {
                if (leftCount <= 0) break;
                const key = `${col}-${row}`;
                // 检查是否有植物占据该格子
                if (scene.gardener.planted.has(key)) {
                    const list = scene.gardener.planted.get(key);
                    if (list && list.length > 0) continue; // 该格子有植物
                }
                // 保证 TNT Mines 不在同一行或同一列
                if (usedRows.has(row) || usedCols.has(col)) continue;

                // 可以放置 TNT Mines

                const { x: tmpx, y: tmpy } = this.gardener.positionCalc.getPlantBottomCenter(col, row);
                // 记录目标位置
                targetPositions.push({ x: tmpx, y: tmpy, col: col, row: row });

                leftCount--;
                usedRows.add(row);
                usedCols.add(col);
            }
        }

        // 第二遍：如果第一遍放置不足，则放宽行、列唯一性限制
        if (leftCount > 0) {
            for (let col = scene.GRID_COLS - 1; col >= 0 && leftCount > 0; col--) {
                // 同样随机打乱行顺序
                const rows = Array.from({ length: scene.GRID_ROWS }, (_, i) => i);
                rows.sort(() => this.random() - 0.5);

                for (const row of rows) {
                    if (leftCount <= 0) break;
                    const key = `${col}-${row}`;
                    if (scene.gardener.planted.has(key)) {
                        const list = scene.gardener.planted.get(key);
                        if (list && list.length > 0) continue; // 该格子有植物
                    }
                    const { x: tmpx, y: tmpy } = this.gardener.positionCalc.getPlantBottomCenter(col, row);
                    if (targetPositions.some(pos => pos.x === tmpx && pos.y === tmpy)) continue; // 避免重复
                    targetPositions.push({ x: tmpx, y: tmpy, col: col, row: row });

                    leftCount--;
                }
            }
        }

        // 开始放置
        for (const pos of targetPositions) {
            StartArc(scene, this.x, this.y, pos.x, pos.y, 'plant/tnt_mines', 1000, () => {
                const newmine = NewTntMines(scene, pos.col, pos.row, this.level);
                newmine.wakeup();
            });
        }
    }


    public wakeup(): void {
        if (this.health > 0 && this.isBuried && this.game) {
            this.isBuried = false;
            this.head.setVisible(false);
            createDirtOut(this.game, this.col, this.row, () => {
                this.setVisible(true);
            });
        }
    }

    public takeDamage(amount: number, monster: IMonster): void {
        if (!this.game) return;

        if (this.isBuried) {
            super.takeDamage(amount, monster);
        } else {
            const rightDistance = this.level >= 9 ? 1.5 : 1;
            new IExpolsion(this.game, this.x, this.row, {
                damage: 1500,
                rightGrid: rightDistance,
                leftGrid: 0.5,
                upGrid: 0
            });
            this.destroyPlant();
        }
    }

    destroy(fromScene?: boolean): void {
        this.head?.destroy();
        super.destroy(fromScene);
    }
}

function NewTntMines(scene: Game, col: number, row: number, level: number): _TntMines {
    const buriedTime = GetDecValue(15000, 0.8, level);
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
        case 3:
            return [{
                type: 1,
                count: 300
            }, {
                type: 3,
                count: 2
            }, {
                type: 4,
                count: 2
            }];
        case 4:
            return [{
                type: 1,
                count: 500
            }, {
                type: 3,
                count: 3
            }, {
                type: 5,
                count: 2
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