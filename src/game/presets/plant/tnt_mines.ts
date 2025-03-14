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
        this.health = 300;

        this.Timer = scene.time.addEvent({
            delay: buriedTime, // 出土时间
            loop: false,
            callback: () => {
                if (this.health > 0) {
                    this.setFrame(1);
                    this.isBuried = false;
                }
            },
            callbackScope: this,
        });
    }

    public onStarShards(): void {
        super.onStarShards();
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

function NewTntMines(scene: Game, col: number, row: number, level: number): IPlant {
    const buriedTime = 16000;
    const furnace = new _TntMines(scene, col, row, level, buriedTime);
    return furnace;
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