import i18n from "../../../utils/i18n";
import { IPlant, INightPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";
import NewSnowBullet from "../bullet/snowball";

class smallDispenser extends INightPlant {
    maxDistance: number; // 画面的绝对坐标,非格子
    damage: number;
    constructor(scene: Game, col: number, row: number, texture: string, level: number) {
        let maxDistance = (3.8 * scene.positionCalc.GRID_SIZEX);
        // 精英1, 提升攻击范围
        if (level >= 5) {
            maxDistance = 5.2 * scene.positionCalc.GRID_SIZEX;
        }

        super(scene, col, row, texture, SmallDispenserRecord.pid, level);
        this.setHealthFirstly(300);
        this.maxDistance = maxDistance;

        this.Timer = scene.time.addEvent({
            startAt: 1200, // 已经使用的时间,即开始时间
            callback: () => {
                if (this.health > 0) {
                    if (scene.monsterSpawner.hasMonsterInRowAfterX(this.row, this.x, this.maxDistance)) {
                        shootSnowBall(scene, this, this.maxDistance);
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
    const small_dispenser = new smallDispenser(scene, col, row, 'plant/small_dispenser', level);
    // 精英2, 白天不睡觉
    if (level === 9) {
        small_dispenser.setSleeping(false);
    }
    return small_dispenser;
}

function shootSnowBall(scene: Game, shooter: IPlant, maxDistance: number) {
    const level = shooter.level;
    //  根据等级略微提高伤害
    const damage = 15 + 1 * Math.min(level, 4) + 0.5 * Math.max(0, level - 4);

    if (!shooter.isSleeping) {
        const arrow = NewSnowBullet(scene, shooter.col, shooter.row, maxDistance, damage);
    }
}

const SmallDispenserRecord: IRecord = {
    pid: 5,
    name: '小发射器',
    cost: () => 0,
    cooldownTime: () => 5,
    NewFunction: NewDispenser,
    texture: 'plant/small_dispenser',
    description: i18n.S('small_dispenser_description')
};

export default SmallDispenserRecord;
