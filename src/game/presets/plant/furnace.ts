import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";

class Furnace extends IPlant {
    constructor(scene: Game, col: number, row: number) {
        super(scene, col, row, FurnaceRecord.texture, FurnaceRecord.pid);
        this.setFrame(0);
        this.health = 30;

        this.Timer = scene.time.addEvent({
            delay: 18000, // 每25秒生产能量
            startAt: 13500,
            loop: true,
            callback: () => {
                if (this.health > 0) {
                    this.setFrame(1);
                    scene.time.delayedCall(1000, () => {
                        if (this && this.health && this.health > 0) {
                            scene.broadCastEnergy(+50);
                            this.setFrame(0);
                        }
                    });
                }
            },
            callbackScope: this,
        });
        console.log(this.body?.width, this.body?.height)
    }


}

function NewFurnace(scene: Game, col: number, row: number): IPlant {
    const furnace = new Furnace(scene, col, row);
    return furnace;
}


const FurnaceRecord: IRecord = {
    pid: 2,
    name: '熔炉',
    cost: 50,
    cooldownTime: 7.5,
    NewFunction: NewFurnace,
    texture: 'plant/furnace',
};

export default FurnaceRecord;