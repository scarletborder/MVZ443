import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";
import NewSnowBullet from "../bullet/snowball";

class smallDispenser extends IPlant {
    maxDistance: number; // 画面的绝对坐标,非格子
    constructor(scene: Game, col: number, row: number, texture: string, level: number) {
        const maxDistance = (4 * scene.positionCalc.GRID_SIZEX);
        super(scene, col, row, texture, SmallDispenserRecord.pid, level);
        this.health = 300;
        this.maxDistance = maxDistance;

        // 如果图片边界不完全匹配，可根据需要调整碰撞盒偏移

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
    const peashooter = new smallDispenser(scene, col, row, 'plant/small_dispenser', level);
    return peashooter;
}

function shootSnowBall(scene: Game, shooter: IPlant, maxDistance: number) {
    // console.log('fire')
    // console.log(shooter.col, shooter.row)

    const arrow = NewSnowBullet(scene, shooter.col, shooter.row, maxDistance);
}


const description = `
小型发射器能发射短距离的雪球。

技能：射出一个越滚越大的雪球

伤害：中等

白天失效

雪球里包着石头，别问了。
`
const SmallDispenserRecord: IRecord = {
    pid: 5,
    name: '小发射器',
    cost: () => 0,
    cooldownTime: 5,
    NewFunction: NewDispenser,
    texture: 'plant/small_dispenser',
    description: description
};

export default SmallDispenserRecord;
