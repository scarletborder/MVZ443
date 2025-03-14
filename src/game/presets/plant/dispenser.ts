import i18n from "../../../utils/i18n";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";
import NewArrow from "../bullet/arrow";

class dispenser extends IPlant {
    game: Game;
    public onStarShards(): void {
        super.onStarShards();

        let count = 0;
        const intervalTime = 50;  // Interval between each shootArrow call in milliseconds
        const totalArrows = 50;    // Total number of arrows to shoot

        // Using Phaser's delayedCall to repeatedly shoot arrows
        const shootArrowRepeatedly = () => {
            if (count < totalArrows) {
                // 精英2级射出穿透箭矢
                shootArrow(this.game, this, this.level >= 9 ? 5 : 1);  // Fire an arrow
                count++;

                // Schedule the next shootArrow call
                this.scene.time.delayedCall(intervalTime, shootArrowRepeatedly);
            }
        };

        // Start the first call to shootArrow
        shootArrowRepeatedly();
    }

    constructor(scene: Game, col: number, row: number, texture: string, level: number) {
        super(scene, col, row, texture, DispenserRecord.pid, level);
        this.game = scene;
        this.health = 300;

        this.Timer = scene.time.addEvent({
            startAt: 1200, // 已经使用的时间,即开始时间
            callback: () => {
                if (this.health > 0) {
                    // 判断本行之前有没有敌人(TODO:或者背后有并且之前有可反弹的物体)
                    if (scene.monsterSpawner.hasMonsterInRowAfterX(this.row, this.x)) {
                        shootArrow(scene, this);
                    }
                }
            },
            loop: true,
            delay: 1350,  // 每隔1秒发射一次
        });
        console.log(this.Timer.getRemaining())
    }
}

function NewDispenser(scene: Game, col: number, row: number, level: number): IPlant {
    const peashooter = new dispenser(scene, col, row, 'plant/dispenser', level);
    return peashooter;
}

function shootArrow(scene: Game, shooter: IPlant, penetrate = 1) {
    const level = shooter.level;
    //  根据等级略微提高伤害
    const damage = 15 + 1.2 * Math.min(level, 3) + 0.8 * Math.max(level - 3, 0);
    const arrow = NewArrow(scene, shooter.col, shooter.row, scene.positionCalc.GRID_SIZEX * 32, damage);
    arrow.penetrate = penetrate;
}


const DispenserRecord: IRecord = {
    pid: 1,
    name: '发射器',
    cost: (level) => {
        if (level && level >= 5) return 75;
        return 100;
    },
    cooldownTime: () => 5,
    NewFunction: NewDispenser,
    texture: 'plant/dispenser',
    description: i18n.S('dispenser_description')
};

export default DispenserRecord;
