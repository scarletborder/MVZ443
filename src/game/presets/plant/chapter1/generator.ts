import { SECKILL } from "../../../../../public/constants";
import { item } from "../../../../components/shop/types";

import { GetIncValue } from "../../../../utils/numbervalue";
import { INightPlant, IPlant } from "../../../models/IPlant";
import { IRecord } from "../../../models/IRecord";
import { IMonster } from "../../../models/monster/IMonster";
import { Game } from "../../../scenes/Game";

class Generator extends INightPlant {
    game: Game;
    damagedSum: number = 0; // 累计受伤血量

    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, GeneratorRecord.texture, GeneratorRecord.pid, level);
        this.plant_height = 1;
        this.setHealthFirstly(GetIncValue(800, level, 1.2));
        this.game = scene;
        this.damagedSum = 0;
    }

    public onStarShards(): void {
        super.onStarShards();
        if (!this.scene || this.health <= 0) {
            return;
        }
        const scene = this.game;
        // 唤醒自己和周围的plant,并恢复血量
        for (let i = this.col - 1; i <= this.col + 1; i++) {
            for (let j = this.row - 1; j <= this.row + 1; j++) {
                if (i >= 0 && i < scene.positionCalc.Col_Number && j >= 0 && j < scene.positionCalc.Row_Number) {
                    const key = `${i}-${j}`;
                    // 查找list
                    if (scene?.gardener.planted.has(key)) {
                        const list = scene.gardener.planted.get(key);
                        if (list) {
                            for (const plant of list) plant.setSleeping(false);
                        }
                    }
                }
            }
        }
        this.setHealth(this.maxhealth);
    }

    public takeDamage(amount: number, zombie: IMonster): void {
        amount = Math.min(amount, this.health + 10);
        this.damagedSum += amount;
        let energyUpdate = 0;

        while (this.damagedSum >= 20) {
            // 每失去20hp,进行恢复energy. 
            this.damagedSum -= 20;
            let energy = 5;
            if (this.isSleeping) {
                // 睡眠时产能减少
                // 1 : 3
                // >5: 4
                // >9: 6
                energy = (this.level >= 5) ? (this.level >= 9 ? 6 : 4) : 3;
            } else {
                // 1 : 5
                // >9: 8
                energy = (this.level >= 9) ? 8 : 5;
            }
            energyUpdate += energy;
        }

        const scene = this.game;
        scene?.broadCastEnergy(energyUpdate);
        super.takeDamage(amount, zombie);
    }
}

function NewGenerator(scene: Game, col: number, row: number, level: number): IPlant {
    const furnace = new Generator(scene, col, row, level);
    return furnace;
}

const GeneratorRecord: IRecord = {
    pid: 8,
    nameKey: 'name_generator',
    cost: () => 50,
    cooldownTime: () => 32,
    NewFunction: NewGenerator,
    texture: 'plant/generator',
    descriptionKey: 'generator_description',

};

export default GeneratorRecord;