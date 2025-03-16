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
        // 立刻出土,并且从第一排开始尝试放置准备好的炸弹
        this.wakeup();

        for (let preCol = this.game.GRID_COLS - 1; preCol >= 0; preCol--) {
            for (let preRow = 0; preRow < this.game.GRID_ROWS; preRow++) {
                // 查看是否有位置(炸弹是排他的)
                const key = `${preCol}-${preRow}`;
                if (this.game.gardener.planted.has(key)) {
                    const list = this.game.gardener.planted.get(key);
                    if (list && list.length > 0) continue; // 有植物
                }
                // 可以放置
                const newmine = NewTntMines(this.game, preCol, preRow, this.level);
                newmine.wakeup();
                leftCount--;
                if (leftCount === 0) return;
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

const TntMines: IRecord = {
    pid: 4,
    name: 'TNT地雷',
    cost: cost,
    cooldownTime: () => 30,
    NewFunction: NewTntMines,
    texture: 'plant/tnt_mines',
    description: i18n.S('tnt_mines_description')
};

export default TntMines;