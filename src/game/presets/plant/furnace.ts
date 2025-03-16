import { item } from "../../../components/shop/types";
import i18n from "../../../utils/i18n";
import { GetDecValue } from "../../../utils/numbervalue";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";

class Furnace extends IPlant {
    game: Game;
    updateEnergy: number = 25;
    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, FurnaceRecord.texture, FurnaceRecord.pid, level);
        this.game = scene;
        this.setFrame(0);
        this.setHealthFirstly(300);

        if (level >= 9) {
            this.updateEnergy = 40;
        }

        const cooldownTime = GetDecValue(18000, 0.7, level);

        this.Timer = scene.time.addEvent({
            delay: cooldownTime, // 每18秒生产能量
            startAt: cooldownTime * 0.7,
            loop: true,
            callback: () => {
                if (this.health > 0) {
                    this.setFrame(1);
                    scene.time.delayedCall(1000, () => {
                        if (this && this.health && this.health > 0) {
                            scene.broadCastEnergy(+this.updateEnergy);
                            this.setFrame(0);
                        }
                    });
                }
            },
            callbackScope: this,
        });
        console.log(this.body?.width, this.body?.height)
    }

    public onStarShards(): void {
        super.onStarShards();
        // 一次性加能量
        this.game.broadCastEnergy(+450);
    }

}

function NewFurnace(scene: Game, col: number, row: number, level: number): IPlant {
    const furnace = new Furnace(scene, col, row, level);
    return furnace;
}

function cost(level?: number): number {
    if ((level || 1) >= 5) return 35;
    return 50;
}
function levelAndstuff(level: number): item[] {
    return [];
}

const FurnaceRecord: IRecord = {
    pid: 2,
    name: '熔炉',
    cost: cost,
    cooldownTime: () => 6,
    NewFunction: NewFurnace,
    texture: 'plant/furnace',
    description: i18n.S('furnace_description'),
    NextLevelStuff: levelAndstuff
};

export default FurnaceRecord;