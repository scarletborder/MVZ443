// 在pickaxe 耐久用完之前,伤害非常高

import { MIRecord } from "../../models/IRecord";
import { IZombie } from "../../models/monster/IZombie";
import { Game } from "../../scenes/Game";
import { FrameTimer } from "../../sync/ticker";
import NewArrow from "../bullet/arrow";
import { EnhancedSkeleton } from "./skeleton";

export class SkeletonBow extends EnhancedSkeleton {
    currentHatState = 0;
    arrowDamage: number = 70;
    arrowInterval: number = 3500;

    Timer: FrameTimer | null = null;

    constructor(scene: Game, col: number, row: number, texture: string, waveID: number) {
        super(scene, col, row, texture, waveID);
        this.SetSpeedFirstly(20);
        this.attackDamage = 25;

        // 添加pickaxe attackment

        const topX = this.x + this.offsetX - scene.positionCalc.GRID_SIZEX * 0.42;
        const topY = this.y - scene.positionCalc.GRID_SIZEY * 0.7 + this.offsetY;
        const bow = scene.physics.add.sprite(topX, topY, 'attach/hd_bow');
        bow.setScale(scene.positionCalc.scaleFactor * 1.4).setOrigin(0.5, 1);
        bow.setFrame(0);
        this.currentHatState = 0;
        bow.debugShowBody = false;
        scene.physics.add.existing(bow);
        bow.setVisible(true);
        this.attachSprites.set('bow', bow);

        this.setDepth(); // 所有有附加元素的,要单独设置一次

        // 监听射箭和停止射箭
        this.Timer = scene.frameTicker.addEvent({
            delay: this.arrowInterval, // ms
            callback: () => {
                if (this.hasDebuff('frozen') > 0) return; // 冰冻状态不射箭
                // 如果正在近战攻击,放弃
                if (this.attackingPlant) return;
                // 500ms判断前方有无敌人
                if (scene.gardener.hasPlantBeforeX(this.row, this.x)) {
                    // 射一次
                    this.StopMove();
                    this.shootArrow(scene);
                    this.zombieAnim.stopLegSwing();
                    this.zombieAnim.stopArmSwing();
                } else {
                    // 继续前进
                    this.StartMove();
                    this.zombieAnim.startLegSwing();
                }

            },
            loop: true
        });

    }
    destroy(fromScene?: boolean): void {
        this.Timer?.remove();
        super.destroy(fromScene);
    }

    setDepth() {
        // attach 不由本地管
        this.attachSprites.get('bow')?.setDepth(this.baseDepth + 13); // 帽子算比较高的
        super.setDepth();
        return this;
    }

    shootArrow(scene: Game) {
        const damage = this.arrowDamage;
        const arrow = NewArrow(scene, 10, this.row,
            scene.positionCalc.GRID_SIZEX * 32, damage, 'plant');
        arrow.setX(this.x);
        arrow.setY(this.y - scene.positionCalc.GRID_SIZEY * 0.7);
        arrow.setVelocityX(-200 * scene.positionCalc.scaleFactor);
    }
}


function NewSkeletonBow(scene: Game, x: number, y: number, waveID: number): IZombie {
    const zombie = new SkeletonBow(scene, x, y, 'zombie/zombie', waveID);
    zombie.StartMove();
    return zombie;
}

const SkeletonBowRecord: MIRecord = {
    mid: 7,
    name: 'MinerZombie',
    NewFunction: NewSkeletonBow,
    texture: 'zombie/zombie',
    weight: (waveId?: number) => Math.max(800, 1500 - ((waveId || 1) - 15) * 100),
    level: 2,
    leastWaveID: 7,
}

export default SkeletonBowRecord;