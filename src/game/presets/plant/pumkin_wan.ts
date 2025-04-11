import { SECKILL } from "../../../../public/constants";
import { item } from "../../../components/shop/types";
import i18n from "../../../utils/i18n";
import { GetIncValue } from "../../../utils/numbervalue";
import { NewExplosionByGrid } from "../../models/IExplosion";
import { NewLaserByGrid } from "../../models/ILaser";
import { INightPlant, IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";
import { FrameTimer } from "../../sync/ticker";
import PumpkinRecord from "./pumkin";

class pumkin_wan extends INightPlant {
    game: Game;
    maxDistance: number; // 画面的绝对坐标,非格子
    attackInterval: number = 2050;

    public onStarShards(): void {
        super.onStarShards();
        if (!this || !this.game) return;
        const game = this.game;
        const col = this.col;
        const row = this.row;

        game?.frameTicker.addEvent({
            delay: 2000,
            repeat: 4,
            startAt: 1800,
            callback: () => {
                NewExplosionByGrid(game, col, row, {
                    damage: 350,
                    upGrid: 1,
                    leftGrid: 1.5,
                    rightGrid: 1.5,
                })
            }
        })
    }

    constructor(scene: Game, col: number, row: number, texture: string, level: number) {
        // TODO: 首先获得当前格子中作为基座的 阴森南瓜头,判断其isSleeping属性, 并稍后用来实例化自己,destroyPlant基座植物
        const key = `${col}-${row}`;
        const plants = scene.gardener.planted.get(key) || [];
        let isSleeping = false;

        for (const plant of plants) {
            if (plant.pid === PumpkinRecord.pid) { // 基座
                isSleeping = plant.isSleeping;
                plant.destroyPlant();
                break;
            }
        }

        super(scene, col, row, texture, PumpkinWanRecord.pid, level);
        this.setSleeping(isSleeping);

        this.attackInterval = 1550;

        this.game = scene;
        this.setHealthFirstly(400);
        this.setFrame(0);
        this.maxDistance = 3 * scene.positionCalc.GRID_SIZEX;

        this.Timer = this.normalShootEvent();
    }

    normalShootEvent(): FrameTimer {
        const scene = this.game;

        return scene.frameTicker.addEvent({
            startAt: this.attackInterval / 2, // 已经使用的时间,即开始时间
            callback: () => {
                if (this.health > 0 && this.isSleeping === false && scene) {
                    this.setFrame(1);
                    shootLaser(scene, this);
                    this.scene?.time.delayedCall(550, () => {
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
}

function NewPumpkinWan(scene: Game, col: number, row: number, level: number): IPlant {
    const peashooter = new pumkin_wan(scene, col, row, 'plant/pumpkin_wan', level);
    return peashooter;
}


function shootLaser(scene: Game, shooter: IPlant) {
    const level = shooter.level;
    const damage = GetIncValue(65, 1.35, level);
    const start = (level >= 9 ? 2.5 : 1.5);
    const distance = (level >= 9 ? 5 : 3);

    NewLaserByGrid(scene, shooter.col - start, shooter.row - 1, distance, damage, 'zombie', 550, {
        toSky: (level >= 7 ? true : false)
    });
    NewLaserByGrid(scene, shooter.col - start, shooter.row, distance, damage, 'zombie', 550, {
        toSky: (level >= 7 ? true : false)
    });
    NewLaserByGrid(scene, shooter.col - start, shooter.row + 1, distance, damage, 'zombie', 550, {
        toSky: (level >= 7 ? true : false)
    });
}

function levelAndstuff(level: number): item[] {
    switch (level) {
        case 1:
            return [{
                type: 1,
                count: 300
            }, {
                type: 3,
                count: 4
            }, {
                type: 2,
                count: 2
            }]
    }
    return [{
        type: SECKILL,
        count: 1
    }];
    return [];
}

function cost(level?: number): number {
    if ((level || 1) >= 5 && (level || 1) < 7) return 275;
    if ((level || 1) >= 7) return 300;
    return 325;
}

function coolDownTime(level?: number): number {
    level = level || 1;
    if (level >= 9) return 58;
    return 52;
}

const PumpkinWanRecord: IRecord = {
    pid: 11,
    name: '广域南瓜派',
    cost: cost,
    cooldownTime: coolDownTime,
    NewFunction: NewPumpkinWan,
    texture: 'plant/pumpkin_wan',
    description: i18n.S('pumpkin_wan_description'),
    NextLevelStuff: levelAndstuff,
    needFirstCoolDown: false
};

export default PumpkinWanRecord;
