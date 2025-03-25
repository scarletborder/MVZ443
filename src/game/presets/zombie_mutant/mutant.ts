// enhanced golem preset
// not for boss, but for normal monster
// 提供给如 "突变僵尸", "重炮突变僵尸" 这样的僵尸使用

import { IMonster } from "../../models/IRecord";
import { Game } from "../../scenes/Game";
import IMutantAnim from "../../sprite/zombie_mutant";



export default class IMutant extends Phaser.Physics.Arcade.Sprite implements IMonster {
    public static Group: Phaser.Physics.Arcade.Group;

    // 属性
    health: number;
    maxHealth: number;

    // 动画
    anim: IMutantAnim

    /**
     * 利用IZombie的Group来初始化Imutant的Group
     * @param scene 
     * @param group 
     */
    static InitGroup(scene: Game, group: Phaser.Physics.Arcade.Group) {
        this.Group = group;
    }

    public getIsFlying(): boolean {
        return false;
    }

    public getIsInVoid(): boolean {
        return false;
    }

    public setHealthFirstly(health: number) {
        this.health = health;
        this.maxHealth = health;
    }

    public setHealth(health: number) {
        this.health = health;
        if (this.health <= 0) {
            this.destroy();
        }
    }

    public takeDamage(damage: number, projectileType?: "bullet" | "laser" | "explosion" | "trajectory") {
        const newHealth = this.health - damage;
        this.setHealth(newHealth);
    }
}