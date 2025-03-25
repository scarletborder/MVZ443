// enhanced golem preset
// not for boss, but for normal monster
// 提供给如 "突变僵尸", "重炮突变僵尸" 这样的僵尸使用

import DepthManager from "../../../utils/depth";
import { IMonster, MIRecord } from "../../models/IRecord";
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

export default class IMutant extends Phaser.Physics.Arcade.Sprite implements IMonster {
    public static Group: Phaser.Physics.Arcade.Group;
    game: Game;

    // 属性
    health: number;
    maxHealth: number;

    row: number;
    waveID: number;

    // 动画
    anim: IMutantAnim
    baseDepth: number;

    /**
     * 利用IZombie的Group来初始化Imutant的Group
     * @param scene 
     * @param group 
     */
    static InitGroup(scene: Game, group: Phaser.Physics.Arcade.Group) {
        this.Group = group;
    }

    constructor(scene: Game, col: number, row: number, waveID: number,
        newAnim: (scene: Game, x: number, y: number) => IMutantAnim) {
            row = 4;
        const { x, y } = scene.positionCalc.getZombieBottomCenter(col - 2, row);
        super(scene, x, y, 'zombie/zombie');

        this.waveID = waveID;
        this.game = scene;
        this.setVisible(false);

        this.anim = newAnim(scene, x, y);
        this.baseDepth = DepthManager.getZombieBasicDepth(row, 0);
        this.setDepth();

        scene.add.existing(this);
        scene.physics.add.existing(this);

        setDisplay(this, scene);

        IMutant.Group.add(this, true);


        console.log(this.x)
    }

    setDepth(): this {
        this.anim.setDepth(this.baseDepth);
        return this;
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

    public getIsFlying(): boolean {
        return false;
    }

    public getIsInVoid(): boolean {
        return false;
    }

    public getWaveID(): number {
        return this.waveID;
    }

    public getRow(): number {
        return this.row;
    }

    public getX(): number {
        return this.x;
    }

    public update(...args: any[]): void {
        this.anim.updatePosition(this.x, this.y);
    }
}

const defaultAnimProps = (scene: Game, x: number, y: number): IMutantAnim => {
    const Props: MutantAnimProps = {
        Species: "default_mutant",
        bodyKey: 'sprMutantBody',
        bodyNum: 2,
        headKey: 'sprMutantHead',
        upperArmKey: 'sprMutantUpperArm',
        lowerArmKey: 'sprMutantLowerArm',
        upperLegKey: 'sprMutantUpperLeg',
        lowerLegKey: 'sprMutantLowerLeg',

    }
    return new IMutantAnim(scene, x, y, Props);
}

function NewMutant(scene: Game, x: number, y: number, waveID: number): IMutant {
    const zomb = new IMutant(scene, x, y, waveID, defaultAnimProps);
    zomb.anim.startLegSwing();
    zomb.anim.startArmSwing();
    zomb.anim.startBodySwing();
    scene.time.delayedCall(1000, () => {
        zomb.anim.startThrow()
    })
    zomb.setVelocityX(-20 * scene.positionCalc.scaleFactor);
    return zomb;
}

export const MutantRecord: MIRecord = {
    mid: 15,
    name: "突变僵尸",
    NewFunction: NewMutant,
    texture: 'zombie/zombie',
    weight(waveId) {
        return 1;
    },
    level: 7,
    leastWaveID: 10,
}