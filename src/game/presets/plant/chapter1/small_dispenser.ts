import { SECKILL } from "../../../../../public/constants";
import { item } from "../../../../components/shop/types";
import ProjectileDamage from "../../../../constants/damage";

import { GetIncValue } from "../../../../utils/numbervalue";
import { IExpolsion } from "../../../models/IExplosion";
import { IPlant, INightPlant } from "../../../models/IPlant";
import { IRecord } from "../../../models/IRecord";
import { Game } from "../../../scenes/Game";
import createShootBurst from "../../../sprite/shoot_anim";
import NewSnowBullet, { SnowBall } from "../../bullet/snowball";

class smallDispenser extends INightPlant {
    maxDistance: number; // 画面的绝对坐标,非格子

    game: Game
    constructor(scene: Game, col: number, row: number, texture: string, level: number) {
        let maxDistance = (3.6 * scene.positionCalc.GRID_SIZEX);
        // 精英1, 提升攻击范围
        if (level >= 5) {
            maxDistance = 5.6 * scene.positionCalc.GRID_SIZEX;
        }

        super(scene, col, row, texture, SmallDispenserRecord.pid, level);
        this.plant_height = 1;
        this.game = scene;
        this.setHealthFirstly(300);
        this.maxDistance = maxDistance;

        this.Timer = scene.frameTicker.addEvent({
            startAt: 500, // 已经使用的时间,即开始时间
            callback: () => {
                if (this && this.health > 0 && scene) {
                    if (scene.monsterSpawner.hasMonsterInRowAfterX(this.row, this.x, this.maxDistance)) {
                        shootSnowBall(scene, this, this.maxDistance);
                    }
                }
            },
            loop: true,
            delay: 1000,  // 每隔1秒发射一次
        });
    }

    public onStarShards(): void {
        super.onStarShards();

        if (this.isSleeping) this.setSleeping(false);

        // 射出一个炸弹雪球

        const snowball = new BombSnowBall(this.game, this.col, this.row, 'bullet/fireball',
            GetIncValue(ProjectileDamage.bullet.bomb_fireBall, 1.2, this.level),
            this.game?.positionCalc.GRID_SIZEY * 12, 'zombie');
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
    const damage = GetIncValue(ProjectileDamage.bullet.snowBall, level, 1.3);


    if (!shooter.isSleeping) {
        createShootBurst(scene, shooter.x + shooter.width * 1 / 3, shooter.y - shooter.height / 7,
            16, shooter.depth + 1);
        const arrow = NewSnowBullet(scene, shooter.col, shooter.row, maxDistance, damage);
    }
}


class BombSnowBall extends SnowBall {
    destroy(): void {
        const scene = this.game;
        const x = this.x;
        const row = this.row;
        const dmg = ProjectileDamage.bullet.bomb_fireBall_splash;
        super.destroy();
        if (!scene) return;
        // 生成大爆炸
        new IExpolsion(scene, x, row, {
            damage: dmg,
            rightGrid: 1.75,
            leftGrid: 1.5,
            upGrid: 1,
        });
    }
}

const SmallDispenserRecord: IRecord = {
    pid: 5,
    nameKey: 'name_small_dispenser',
    cost: () => 0,
    cooldownTime: () => 10,
    NewFunction: NewDispenser,
    texture: 'plant/small_dispenser',
    descriptionKey: 'small_dispenser_description',

};

export default SmallDispenserRecord;
