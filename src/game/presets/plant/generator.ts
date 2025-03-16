import { SECKILL } from "../../../../public/constants";
import { item } from "../../../components/shop/types";
import i18n from "../../../utils/i18n";
import { GetIncValue } from "../../../utils/numbervalue";
import { INightPlant, IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { IZombie } from "../../models/IZombie";
import { Game } from "../../scenes/Game";

class Generator extends INightPlant {
    game: Game;
    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, GeneratorRecord.texture, GeneratorRecord.pid, level);
        this.setHealthFirstly(GetIncValue(800, level, 1.25));
        this.game = scene;
    }

    public onStarShards(): void {
        super.onStarShards();
        // 唤醒自己和周围的plant,并恢复血量
        for (let i = this.col - 1; i <= this.col + 1; i++) {
            for (let j = this.row - 1; j <= this.row + 1; j++) {
                if (i >= 0 && i < this.game.positionCalc.Col_Number && j >= 0 && j < this.game.positionCalc.Row_Number) {
                    const key = `${i}-${j}`;
                    // 查找list
                    if (this.game.gardener.planted.has(key)) {
                        const list = this.game.gardener.planted.get(key);
                        if (list) {
                            for (const plant of list) plant.setSleeping(false);
                        }
                    }
                }
            }
        }
        this.setHealth(this.maxhealth);
    }

    public takeDamage(amount: number, zombie: IZombie): void {
        if (this.isSleeping) {
            const ratio = (this.level >= 5) ? (this.level >= 9 ? 6 : 7.5) : 10;
            this.game.broadCastEnergy(Math.ceil(amount / ratio));
        } else {
            const ratio = (this.level >= 9) ? 5 : 5.8;
            this.game.broadCastEnergy(Math.ceil(amount / ratio));
        }
        super.takeDamage(amount, zombie);
    }
}

function NewGenerator(scene: Game, col: number, row: number, level: number): IPlant {
    const furnace = new Generator(scene, col, row, level);
    return furnace;
}


function levelAndstuff(level: number): item[] {
    switch (level) {
        case 1:
            return [{
                type: 1,
                count: 250
            }, {
                type: 3,
                count: 3
            }];
        case 2:
            return [{
                type: 1,
                count: 360
            }, {
                type: 2,
                count: 4
            }];
    }
    return [{
        type: SECKILL,
        count: 1
    }];
    return [];
}
const GeneratorRecord: IRecord = {
    pid: 8,
    name: '生物质发电机',
    cost: () => 50,
    cooldownTime: () => 32,
    NewFunction: NewGenerator,
    texture: 'plant/generator',
    description: i18n.S('generator_description'),
    NextLevelStuff: levelAndstuff
};

export default GeneratorRecord;