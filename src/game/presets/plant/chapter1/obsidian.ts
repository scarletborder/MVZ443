import { SECKILL } from "../../../../../public/constants";
import { item } from "../../../../components/shop/types";

import { GetIncValue } from "../../../../utils/numbervalue";
import { IPlant } from "../../../models/IPlant";
import { IRecord } from "../../../models/IRecord";
import { IMonster } from "../../../models/monster/IMonster";
import { Game } from "../../../scenes/Game";

class Obsidian extends IPlant {
    shieldHealth: number = 0;
    maxShieldHealth: number = 6000;
    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, ObsidianRecord.texture, ObsidianRecord.pid, level);
        this.setFrame(0);
        this.setHealthFirstly(GetIncValue(4000, 1.4, level));
    }

    public onStarShards(): void {
        super.onStarShards();
        // 设置护盾
        if (this.health > 0) {
            this.shieldHealth = this.maxShieldHealth;
            this.setHealth(this.maxhealth);
        }
    }

    public takeDamage(amount: number, monster: IMonster): void {
        const shieldRatio = (this.level >= 9) ? 0.8 : 1;
        if (this.shieldHealth > amount) {
            this.shieldHealth -= amount * shieldRatio;
        } else {
            amount -= Math.ceil(this.shieldHealth * (1 / shieldRatio));
            this.shieldHealth = 0;
            super.takeDamage(amount, monster);
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

function cooldownTime(level?: number): number {
    if ((level || 1) >= 5) return 24;
    return 32;
}

const ObsidianRecord: IRecord = {
    pid: 3,
    nameKey: 'name_obsidian',
    cost: () => 50,
    cooldownTime: cooldownTime,
    NewFunction: NewObsidian,
    texture: 'plant/obsidian',
    descriptionKey: 'obsidian_description',
    needFirstCoolDown: true,

};

export default ObsidianRecord;