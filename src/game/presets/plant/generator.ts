import i18n from "../../../utils/i18n";
import { INightPlant, IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { IZombie } from "../../models/IZombie";
import { Game } from "../../scenes/Game";

class Generator extends INightPlant {
    maxhealth: number = 800;
    game: Game;
    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, GeneratorRecord.texture, GeneratorRecord.pid, level);
        this.setHealthFirstly(800);
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
            this.game.broadCastEnergy(Math.ceil(amount / 20));
        } else {
            this.game.broadCastEnergy(Math.ceil(amount / 5));
        }
        super.takeDamage(amount, zombie);
    }
}

function NewGenerator(scene: Game, col: number, row: number, level: number): IPlant {
    const furnace = new Generator(scene, col, row, level);
    return furnace;
}



const GeneratorRecord: IRecord = {
    pid: 8,
    name: '生物质发电机',
    cost: () => 50,
    cooldownTime: () => 32,
    NewFunction: NewGenerator,
    texture: 'plant/generator',
    description: i18n.S('generator_description')
};

export default GeneratorRecord;