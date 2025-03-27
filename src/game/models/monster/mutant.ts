// enhanced golem preset
// not for boss, but for normal monster
// 提供给如 "突变僵尸", "重炮突变僵尸" 这样的僵尸使用

import DepthManager from "../../../utils/depth";
import { IPlant } from "../../models/IPlant";
import { MIRecord } from "../../models/IRecord";
import { IMonster } from "../../models/monster/IMonster";
import { Game } from "../../scenes/Game";
import IMutantAnim, { MutantAnimProps } from "../../sprite/zombie_mutant";

function setDisplay(spr: IMutant, scene: Game) {
    let size = scene.positionCalc.getZombieBodySize();
    spr.setBodySize(size.sizeX, size.sizeY * 0.9);
    size = scene.positionCalc.getZombieDisplaySize();
    spr.setDisplaySize(size.sizeX, size.sizeY);
    spr.setOffset(10 * scene.positionCalc.scaleFactor, + 20 * scene.positionCalc.scaleFactor);
    spr.setOrigin(0.5, 1);
}

export default class IMutant extends IMonster {
    // 动画
    anim: IMutantAnim
    baseDepth: number;

    // 逻辑
    isAttacking: boolean = false;
    isDying: boolean = false;
    attackedPlants: IPlant[] = [];
    preAttackedPlants: IPlant | null = null;

    constructor(scene: Game, col: number, row: number, waveID: number,
        newAnim: (scene: Game, x: number, y: number) => IMutantAnim) {
        // TODO: for debug
        row = 4;
        col -= 2;

        super(scene, col, row, waveID);
        const x = this.x;
        const y = this.y;

        this.anim = newAnim(scene, x, y);
        this.baseDepth = DepthManager.getZombieBasicDepth(row, 0);
        this.setDepth();

        this.couldCarryStarShards = true;
    }

    setDepth(): this {
        this.anim.setDepth(this.baseDepth);
        return this;
    }

    startAttacking(plant: IPlant) {
        // 已经在攻击你了
        if (this.attackedPlants.includes(plant) || this.preAttackedPlants === plant) return;

        // 首先判断是否已经在攻击plant
        if (this.isAttacking && this.attackedPlants.length > 0) {
            // 如果有,判断是否在同一个格子内
            if (this.attackedPlants[0].col === plant.col &&
                this.attackedPlants[0].row === plant.row) {
                // 如果在一个格子内,加入即将秒杀的array,在本次攻击流程结束后,一起把这个plant给秒杀了
                this.attackedPlants.push(plant);
                return;
            } else {
                // 如果不在,那么将他加入即将攻击目标,如果即将攻击目标已经存在了,那么忽视此次碰撞
                if (this.preAttackedPlants) return;
                this.preAttackedPlants = plant;
                return;
            }
            // 在攻击流程结束后,查看是否有即将攻击目标,如果有,那么继续攻击,否则往前行驶
            return;
        } else {
            // 如果没有,那么直接攻击
            this.attackedPlants.push(plant);
            this.startAttackProcess();
        }
        return;
    }

    startAttackProcess() {
        if (!this || !this.game) return;

        const scene = this.game;
        // 开始一次完整的攻击流程,包括动画和挥舞,然后到造成伤害
        this.isAttacking = true;
        try {
            this.anim.startLeftArmSmash();
            scene.time.delayedCall(1200, () => {
                if (!this || this.health <= 0 || !this.game) return;
                this.attackedPlants.forEach(plant => {
                    plant.takeDamage(5500, this);
                });
                this.attackedPlants = [];
                if (this.preAttackedPlants) {
                    this.attackedPlants.push(this.preAttackedPlants);
                    this.preAttackedPlants = null;
                    this.startAttackProcess();
                } else {
                    this.isAttacking = false;
                }
            });
        } finally {
            if (!this) return;
            this.isAttacking = false;
        }

    }

    public update(...args: any[]): void {
        this.anim.updatePosition(this.x, this.y);
    }

    public takeDamage(damage: number, projectileType?: "bullet" | "laser" | "explosion" | "trajectory") {
        const realDamage = damage;
        super.takeDamage(realDamage, projectileType);
    }

    public setHealth(health: number) {
        super.setHealth(health);
        if (this.health <= 0) {
            this.destoryZombie();
        }
    }

    destoryZombie() {
        // Ensure we don't proceed if this object is already destroyed or undefined
        if (!this || !this.game) return;

        const scene = this.game;
        const anim = this.anim;

        // Stop all tweens (animations)
        scene.tweens.killTweensOf([
            anim.body,
            anim.head,
            anim.upperArmLeft,
            anim.upperArmRight,
            anim.upperLegLeft,
            anim.upperLegRight,
            anim.lowerArmLeft,
            anim.lowerArmRight
        ]);

        // Safely destroy all components only if they are defined
        if (anim.body) anim.body.destroy();
        if (anim.head) anim.head.destroy();
        if (anim.upperArmLeft) anim.upperArmLeft.destroy();
        if (anim.upperArmRight) anim.upperArmRight.destroy();
        if (anim.lowerArmLeft) anim.lowerArmLeft.destroy();
        if (anim.lowerArmRight) anim.lowerArmRight.destroy();
        if (anim.upperLegLeft) anim.upperLegLeft.destroy();
        if (anim.upperLegRight) anim.upperLegRight.destroy();
        if (anim.lowerLegLeft) anim.lowerLegLeft.destroy();
        if (anim.lowerLegRight) anim.lowerLegRight.destroy();

        // Stop all animations (specifically arm/leg swings or other actions)
        if (anim.armTween) {
            anim.armTween.stop();
            anim.armTween = null;
        }
        if (anim.legLeftTween) {
            anim.legLeftTween.stop();
            anim.legLeftTween = null;
        }
        if (anim.legRightTween) {
            anim.legRightTween.stop();
            anim.legRightTween = null;
        }

        // Clean up any attached objects like handObject or backObject if they exist
        if (anim.handObject) {
            anim.handObject.destroy();
            anim.handObject = null;
        }
        if (anim.backObject) {
            anim.backObject.destroy();
            anim.backObject = null;
        }

        // Finally, destroy the zombie sprite itself
        this.destroy();
    }






}
