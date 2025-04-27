import { SECKILL } from "../../../../../public/constants";
import { item } from "../../../../components/shop/types";

import { GetDecValue } from "../../../../utils/numbervalue";
import { IPlant } from "../../../models/IPlant";
import { IRecord } from "../../../models/IRecord";
import { Game } from "../../../scenes/Game";

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

        const cooldownTime = GetDecValue(25000, 0.85, level);

        this.Timer = scene.frameTicker.addEvent({
            delay: cooldownTime, // 每18秒生产能量
            startAt: cooldownTime * 0.7,
            loop: true,
            callback: () => {
                if (this.isSleeping) return;
                if (this.health > 0 && scene && scene.time) {
                    this.setFrame(1);
                    scene.broadCastEnergy(+this.updateEnergy);
                    scene?.time.delayedCall(1000, () => {
                        if (this && this.health && this.health > 0) {
                            this.setFrame(0);
                        }
                    });
                }
            },
        });
    }

    public onStarShards(): void {
        super.onStarShards();
        // 一次性加能量
        this.game?.broadCastEnergy(+450);
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

const FurnaceRecord: IRecord = {
    pid: 2,
    nameKey: 'name_furnace',
    cost: cost,
    cooldownTime: () => 6,
    NewFunction: NewFurnace,
    texture: 'plant/furnace',
    descriptionKey: 'furnace_description',

};

export default FurnaceRecord;