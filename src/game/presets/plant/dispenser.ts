import i18n from "../../../utils/i18n";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";
import NewArrow from "../bullet/arrow";

class dispenser extends IPlant {
    constructor(scene: Game, col: number, row: number, texture: string, level: number) {
        super(scene, col, row, texture, DispenserRecord.pid, level);
        this.health = 300;

        // 如果图片边界不完全匹配，可根据需要调整碰撞盒偏移

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

function shootArrow(scene: Game, shooter: IPlant) {
    // console.log('fire')
    // console.log(shooter.col, shooter.row)
    const arrow = NewArrow(scene, shooter.col, shooter.row);
}


const DispenserRecord: IRecord = {
    pid: 1,
    name: '发射器',
    cost: () => 75,
    cooldownTime: 5,
    NewFunction: NewDispenser,
    texture: 'plant/dispenser',
    description: i18n.S('dispenser_description')
};

export default DispenserRecord;
