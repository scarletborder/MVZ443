import i18n from "../../../utils/i18n";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { IZombie } from "../../models/IZombie";
import { Game } from "../../scenes/Game";

class Obsidian extends IPlant {
    shieldHealth: number = 0;
    maxShieldHealth: number = 4000;
    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, ObsidianRecord.texture, ObsidianRecord.pid, level);
        this.setFrame(0);
        this.setHealthFirstly(4000);
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

function NewObsidian(scene: Game, col: number, row: number, level: number): IPlant {
    const furnace = new Obsidian(scene, col, row, level);
    return furnace;
}



const ObsidianRecord: IRecord = {
    pid: 3,
    name: '黑曜石',
    cost: () => 50,
    cooldownTime: () => 32,
    NewFunction: NewObsidian,
    texture: 'plant/obsidian',
    description: i18n.S('obsidian_description')
};

export default ObsidianRecord;