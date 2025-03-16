import { SECKILL } from "../../../../public/constants";
import { item } from "../../../components/shop/types";
import i18n from "../../../utils/i18n";
import { GetDecValue, GetIncValue } from "../../../utils/numbervalue";
import { NewLaserByGrid } from "../../models/ILaser";
import { INightPlant, IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";

class pumkin extends INightPlant {
    game: Game;
    maxDistance: number; // 画面的绝对坐标,非格子
    attackInterval: number = 2050;

    public onStarShards(): void {
        super.onStarShards();

        if (this.Timer) {
            this.Timer.remove();
        }

        // master spark
        this.sparkShoot();
        this.game.time.delayedCall(2000, () => {
            if (this && this.health > 0) {
                this.setFrame(0);
                if (this.isSleeping) {
                    this.setSleeping(false);
                }
                this.Timer = this.normalShootEvent(); // resume normal shoot
            }
        });
    }

    constructor(scene: Game, col: number, row: number, texture: string, level: number) {
        super(scene, col, row, texture, PumpkinRecord.pid, level);

        this.attackInterval = GetDecValue(2050, 0.6, level);

        this.game = scene;
        this.setHealthFirstly(300);
        this.setFrame(0);
        this.maxDistance = (attackDistance() * scene.positionCalc.GRID_SIZEX);

        this.Timer = this.normalShootEvent();
    }

    normalShootEvent(): Phaser.Time.TimerEvent {
        return this.game.time.addEvent({
            startAt: this.attackInterval / 2, // 已经使用的时间,即开始时间
            callback: () => {
                if (this.health > 0 && this.isSleeping === false &&
                    this.scene.monsterSpawner.hasMonsterInRowAfterX(this.row, this.x, this.maxDistance)) {
                    this.setFrame(1);
                    shootLaser(this.game, this);
                    this.scene.time.delayedCall(400, () => {
                        if (this && this.health && this.health > 0) {
                            this.setFrame(0);
                        }
                    });
                }
            },
            loop: true,
            delay: this.attackInterval,  // 每隔1秒发射一次
        });
    }

    sparkShoot() {
        this.setFrame(1);
        const col = this.col;
        for (let i = 0; i < this.game.positionCalc.Row_Number; i++) {
            NewLaserByGrid(this.game, col, i, 12,
                GetIncValue(1200, 1.35, this.level), 'zombie', 1000);
        }
    }
}

function attackDistance(level: number = 1) {
    return 5.5;
}

function NewPumpkin(scene: Game, col: number, row: number, level: number): IPlant {
    const peashooter = new pumkin(scene, col, row, 'plant/pumpkin', level);
    return peashooter;
}

function shootLaser(scene: Game, shooter: IPlant) {
    const level = shooter.level;
    const damage = GetIncValue(35, 1.4, level);

    if (level < 9) {
        const laser = NewLaserByGrid(scene, shooter.col, shooter.row,
            attackDistance(), damage, 'zombie');
    } else {
        const laser = NewLaserByGrid(scene, shooter.col, shooter.row,
            attackDistance(), damage, 'zombie', 400, {
            debuff: 'slow', duration: 3000
        });
    }

}

function levelAndstuff(level: number): item[] {
    switch (level) {
        case 1:
            return [{
                type: 1,
                count: 200
            }, {
                type: 2,
                count: 3
            }];
    }
    return [{
        type: SECKILL,
        count: 1
    }];
    return [];
}

const PumpkinRecord: IRecord = {
    pid: 9,
    name: '阴森南瓜头',
    cost: () => 75,
    cooldownTime: () => 5,
    NewFunction: NewPumpkin,
    texture: 'plant/pumpkin',
    description: i18n.S('pumpkin_description'),
    NextLevelStuff: levelAndstuff

};

export default PumpkinRecord;
