import { SECKILL } from "../../../../public/constants";
import { item } from "../../../components/shop/types";
import i18n from "../../../utils/i18n";
import { GetIncValue } from "../../../utils/numbervalue";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";
import NewArrow from "../bullet/arrow";

class dispenser extends IPlant {
    game: Game;

    public onStarShards(): void {
        super.onStarShards();

        const totalArrows = 50;    // Total number of arrows to shoot

        // 如果Timer还在,则停止
        if (this.Timer) {
            this.Timer.remove();
        }

        // 替换成暴力设计模块
        this.Timer = this.bruteShootEvent(totalArrows);
        this.game.time.delayedCall(this.Timer.getOverallRemaining(), () => {
            if (this && this.health > 0) {
                if (this.Timer) this.Timer.remove();
                this.Timer = this.normalShootEvent();
            }
        });
    }


    constructor(scene: Game, col: number, row: number, texture: string, level: number) {
        super(scene, col, row, texture, DispenserRecord.pid, level);
        this.game = scene;
        this.setHealthFirstly(300);

        this.Timer = this.normalShootEvent();
    }

    normalShootEvent(): Phaser.Time.TimerEvent {
        return this.game.time.addEvent({
            startAt: 1200, // 已经使用的时间,即开始时间
            callback: () => {
                if (this.health > 0) {
                    // 判断本行之前有没有敌人(TODO:或者背后有并且之前有可反弹的物体)
                    if (this.game.monsterSpawner.hasMonsterInRowAfterX(this.row, this.x)) {
                        shootArrow(this.game, this);
                    }
                }
            },
            loop: true,
            delay: 1350,  // 每隔1秒发射一次
        });
    }

    bruteShootEvent(totalArrows: number): Phaser.Time.TimerEvent {
        const Interval = 50;
        return this.game.time.addEvent({
            callback: () => {
                if (this.health > 0) {
                    const arrow = shootArrow(this.game, this, 35, true);
                }
            },
            repeat: totalArrows - 1,
            delay: Interval,
        });
    }
}

function NewDispenser(scene: Game, col: number, row: number, level: number): IPlant {
    const peashooter = new dispenser(scene, col, row, 'plant/dispenser', level);
    return peashooter;
}

function shootArrow(scene: Game, shooter: IPlant, baseDamage: number = 20, isStar: boolean = false) {
    const level = shooter.level;
    //  根据等级略微提高伤害
    const damage = GetIncValue(baseDamage, level, 1.5);
    let penetrate = 1;
    if (level >= 3) {
        penetrate += 1;
        if (level >= 7) {
            penetrate += 1;
        }
        if (level >= 5 && isStar) {
            penetrate += 1;
        }
    }

    const arrow = NewArrow(scene, shooter.col, shooter.row, scene.positionCalc.GRID_SIZEX * 32, damage);
    arrow.penetrate = penetrate;
    return arrow;
}
function levelAndstuff(level: number): item[] {
    switch (level) {
        case 1:
            return [{
                type: 1,
                count: 100
            }, {
                type: 2,
                count: 1
            }];
        case 2:
            return [{
                type: 1,
                count: 200
            }, {
                type: 2,
                count: 4
            }, {
                type: 3,
                count: 1
            }];
    }
    return [{
        type: SECKILL,
        count: 1
    }];
}

const DispenserRecord: IRecord = {
    pid: 1,
    name: '发射器',
    cost: (level) => {
        if (level && level >= 5) return 75;
        return 100;
    },
    cooldownTime: () => 6,
    NewFunction: NewDispenser,
    texture: 'plant/dispenser',
    description: i18n.S('dispenser_description'),
    NextLevelStuff: levelAndstuff
};

export default DispenserRecord;
