import i18n from "../../../utils/i18n";
import { NewLaserByGrid } from "../../models/ILaser";
import { INightPlant, IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";
import NewArrow from "../bullet/arrow";

class pumkin extends INightPlant {
    game: Game;
    maxDistance: number; // 画面的绝对坐标,非格子

    public onStarShards(): void {
        super.onStarShards();
    }

    constructor(scene: Game, col: number, row: number, texture: string, level: number) {
        super(scene, col, row, texture, PumpkinRecord.pid, level);
        this.game = scene;
        this.setHealthFirstly(300);
        this.setFrame(0);
        this.maxDistance = (attackDistance() * scene.positionCalc.GRID_SIZEX);

        this.Timer = this.normalShootEvent();
    }

    normalShootEvent(): Phaser.Time.TimerEvent {
        return this.game.time.addEvent({
            startAt: 1200, // 已经使用的时间,即开始时间
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
            delay: 2050,  // 每隔1秒发射一次
        });
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
    const laser = NewLaserByGrid(scene, shooter.col, shooter.row,
        attackDistance(), 35, 'zombie');

}


const PumpkinRecord: IRecord = {
    pid: 9,
    name: '阴森南瓜头',
    cost: () => 75,
    cooldownTime: () => 5,
    NewFunction: NewPumpkin,
    texture: 'plant/pumpkin',
    description: i18n.S('pumpkin_description')
};

export default PumpkinRecord;
