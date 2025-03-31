// 龟帽骷髅弓箭手

import { MIRecord } from "../../models/IRecord";
import { IZombie } from "../../models/monster/IZombie";
import { Game } from "../../scenes/Game";
import { SkeletonBow } from "./skeleton_bow";

class TurtleSkeletonBow extends SkeletonBow {
    public attackDamage: number = 400;
    capHealth: number = 375;
    currentHatState = 0;

    arrowDamage: number = 50;
    arrowInterval: number = 2000;

    constructor(scene: Game, col: number, row: number, texture: string, waveID: number) {
        super(scene, col, row, texture, waveID);

        // 戴上海龟帽子
        const topX = this.x + this.offsetX;
        const topY = this.y - scene.positionCalc.GRID_SIZEY * 1.15 + this.offsetY;
        const cap = scene.physics.add.sprite(topX, topY, 'attach/turtle');
        cap.setScale(scene.positionCalc.scaleFactor * 1.4);
        cap.setFrame(0);
        this.currentHatState = 0;
        cap.debugShowBody = false;
        scene.physics.add.existing(cap);
        cap.setVisible(true);
        this.attachSprites.set('cap', cap);

        this.setDepth(); // 所有有附加元素的,要单独设置一次
    }

    public takeDamage(amount: number): void {
        if (this.capHealth > amount) {
            amount *= 0.5;
            this.capHealth -= amount;
        } else {
            this.attachSprites.get('cap')?.setVisible(false);
            super.takeDamage(amount - this.capHealth);
            this.capHealth = 0;

            // 加速
            this.SetSpeedFirstly(40);
            this.arrowDamage = 90;
            // 狂暴射击
            const scene = this.game;
            const bruteTimer = scene.time.addEvent({
                delay: 400, // ms
                callback: () => {
                    if (!scene || !this || this.health < 0) {
                        bruteTimer.remove();
                        return;
                    }
                    this.shootArrow(scene);
                },
                repeat: 4 // 5次
            });
        }

        if (this.capHealth > 0) {
            // 不同cap血量显示不同状态
            if (this.capHealth > 250) {
                this.currentHatState = 0;
            } else if (this.capHealth > 125) {
                this.currentHatState = 1;
            } else {
                this.currentHatState = 2;
            }
            this.attachSprites.get('cap')?.setFrame(this.currentHatState);
        }
    }

    setDepth() {
        // attach 不由本地管
        this.attachSprites.get('cap')?.setDepth(this.baseDepth + 13); // 帽子算比较高的
        super.setDepth();
        return this;
    }
}

function NewSkeletonBow(scene: Game, x: number, y: number, waveID: number): IZombie {
    const zombie = new TurtleSkeletonBow(scene, x, y, 'zombie/zombie', waveID);
    zombie.StartMove();
    return zombie;
}

const TurtleSkeletonBowRecord: MIRecord = {
    mid: 16,
    name: 'TurtleSkeletonBow',
    NewFunction: NewSkeletonBow,
    texture: 'zombie/zombie',
    weight: (waveId?: number) => Math.min(1800, 1000 + (Math.max((waveId || 1) - 15, 0) * 40)),
    level: 3,
    leastWaveID: 10,
    leastWaveIDByStageID(stageID) {
        if (stageID >= 6) {
            return 6;
        }
        return 10;
    },
}

export default TurtleSkeletonBowRecord;