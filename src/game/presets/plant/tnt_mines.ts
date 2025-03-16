import { item } from "../../../components/shop/types";
import i18n from "../../../utils/i18n";
import { IExpolsion } from "../../models/IExplosion";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { IZombie } from "../../models/IZombie";
import { Game } from "../../scenes/Game";

class _TntMines extends IPlant {
    game: Game;
    isBuried: boolean = true;

    constructor(scene: Game, col: number, row: number, level: number, buriedTime: number) {
        super(scene, col, row, TntMines.texture, TntMines.pid, level);
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
        let leftCount = 2;
        // 立刻出土
        this.wakeup();

        // 用于记录已经使用过的行和列
        const usedRows = new Set<number>();
        const usedCols = new Set<number>();

        // 第一遍：保证放置的 TNT Mines 分布在不同的行和列中
        for (let col = this.game.GRID_COLS - 1; col >= 0 && leftCount > 0; col--) {
            for (let row = 0; row < this.game.GRID_ROWS && leftCount > 0; row++) {
                const key = `${col}-${row}`;
                // 检查是否有植物占据该格子
                if (this.game.gardener.planted.has(key)) {
                    const list = this.game.gardener.planted.get(key);
                    if (list && list.length > 0) continue; // 该格子有植物
                }
                // 保证 TNT Mines 不在同一行或同一列
                if (usedRows.has(row) || usedCols.has(col)) continue;

                // 可以放置 TNT Mines
                const newmine = NewTntMines(this.game, col, row, this.level);
                newmine.wakeup();
                leftCount--;
                usedRows.add(row);
                usedCols.add(col);
            }
        }

        // 第二遍：如果第一遍放置不足，则放宽行、列唯一性限制
        if (leftCount > 0) {
            for (let col = this.game.GRID_COLS - 1; col >= 0 && leftCount > 0; col--) {
                for (let row = 0; row < this.game.GRID_ROWS && leftCount > 0; row++) {
                    const key = `${col}-${row}`;
                    if (this.game.gardener.planted.has(key)) {
                        const list = this.game.gardener.planted.get(key);
                        if (list && list.length > 0) continue; // 该格子有植物
                    }
                    const newmine = NewTntMines(this.game, col, row, this.level);
                    newmine.wakeup();
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
            new IExpolsion(this.game, this.x, this.row, {
                damage: 2000,
                rightGrid: 1,
                leftGrid: 0.5,
                upGrid: 0
            });
            this.destroyPlant();
        }
    }
}

function NewTntMines(scene: Game, col: number, row: number, level: number): _TntMines {
    const buriedTime = 16000;
    const mine = new _TntMines(scene, col, row, level, buriedTime);
    return mine;
}

function cost(level?: number): number {
    return 25;
}

function levelAndstuff(level: number): item[] {
    return [];
}

const TntMines: IRecord = {
    pid: 4,
    name: 'TNT地雷',
    cost: cost,
    cooldownTime: () => 30,
    NewFunction: NewTntMines,
    texture: 'plant/tnt_mines',
    description: i18n.S('tnt_mines_description'),
    needFirstCoolDown: true,
    NextLevelStuff: levelAndstuff
};

export default TntMines;