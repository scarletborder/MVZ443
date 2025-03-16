// 在pickaxe 耐久用完之前,伤害非常高

import { IPlant } from "../../models/IPlant";
import { MIRecord } from "../../models/IRecord";
import { IZombie } from "../../models/IZombie";
import { Game } from "../../scenes/Game";
import Gardener from "../../utils/gardener";
import NewArrow from "../bullet/arrow";
import { EnhancedSkeleton } from "./skeleton";

class MinerZombie extends EnhancedSkeleton {
    currentHatState = 0;

    pickaxeSwing: Phaser.Tweens.Tween | null = null;
    Timer: Phaser.Time.TimerEvent | null = null;

    constructor(scene: Game, col: number, row: number, texture: string) {
        super(scene, col, row, texture);
        this.speed = 20 * scene.positionCalc.scaleFactor;
        this.attackDamage = 15;

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
        this.Timer = scene.time.addEvent({
            delay: 2000,
            callback: () => {
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

    setDepth() {
        // attach 不由本地管
        this.attachSprites.get('bow')?.setDepth(this.baseDepth + 13); // 帽子算比较高的
        super.setDepth();
        return this;
    }

    shootArrow(scene: Game) {
        const damage = 45;
        const arrow = NewArrow(scene, 10, this.row,
            scene.positionCalc.GRID_SIZEX * 32, damage, 'plant');
        arrow.setX(this.x);
        arrow.setY(this.y - scene.positionCalc.GRID_SIZEY * 0.7);
        arrow.setVelocityX(-200 * scene.positionCalc.scaleFactor);
        arrow.setScale(-1, 1);

    }
}


function NewSkeletonBow(scene: Game, x: number, y: number): IZombie {
    const zombie = new MinerZombie(scene, x, y, 'zombie/zombie');
    zombie.StartMove();
    return zombie;
}

const SkeletonBowRecord: MIRecord = {
    mid: 7,
    name: 'MinerZombie',
    NewFunction: NewSkeletonBow,
    texture: 'zombie/zombie',
}

export default SkeletonBowRecord;