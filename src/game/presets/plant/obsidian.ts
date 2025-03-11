import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { IZombie } from "../../models/IZombie";
import { Game } from "../../scenes/Game";

class Obsidian extends IPlant {
    maxhealth: number = 4000;
    shieldHealth: number = 0;
    maxShieldHealth: number = 4000;
    constructor(scene: Game, col: number, row: number) {
        super(scene, col, row, ObsidianRecord.texture, ObsidianRecord.pid);
        this.setFrame(0);
        this.health = 4000;
    }

    public takeDamage(amount: number, zombie: IZombie): void {
        if (this.shieldHealth > amount) {
            this.shieldHealth -= amount;
        } else {
            amount -= this.shieldHealth;
            this.shieldHealth = 0;
            super.takeDamage(amount, zombie);
        }
    }

    public setHealth(value: number): void {
        super.setHealth(value);
        // 根据不同血量显示不同的帧
        console.log(this.shieldHealth)
        if (this.health > 0) {
            if (this.shieldHealth > 0) {
                if (this.shieldHealth > this.maxShieldHealth * 2 / 3) {
                    this.setFrame(3);
                }
                else if (this.shieldHealth > this.maxShieldHealth / 3) {
                    this.setFrame(4);
                }
                else {
                    this.setFrame(5);
                }
            } else {
                if (this.health > this.maxhealth * 2 / 3) {
                    this.setFrame(0);
                } else if (this.health > this.maxhealth / 3) {
                    this.setFrame(1);
                } else {
                    this.setFrame(2);
                }
            }
        }
    }

}

function NewObsidian(scene: Game, col: number, row: number): IPlant {
    const furnace = new Obsidian(scene, col, row);
    return furnace;
}

const description = `
黑曜石的强力装甲能够抵御僵尸的攻击。

技能：恢复所有生命值，并获得更加坚硬的护甲

生命：高

听说把黑曜石摆成地狱门的形状再放一个熔炉有惊喜。不如试试看？`;

const ObsidianRecord: IRecord = {
    pid: 3,
    name: '黑曜石',
    cost: () => 50,
    cooldownTime: 7.5,
    NewFunction: NewObsidian,
    texture: 'plant/obsidian',
    description: description
};

export default ObsidianRecord;