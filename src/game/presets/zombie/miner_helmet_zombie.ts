// 在pickaxe 耐久用完之前,伤害非常高

import { IPlant } from "../../models/IPlant";
import { MIRecord } from "../../models/IRecord";
import { IZombie } from "../../models/monster/IZombie";
import { Game } from "../../scenes/Game";
import { EnhancedZombie } from "./zombie";

class MinerHelmetZombie extends EnhancedZombie {
    static maxCapHealth: number = 1100;
    capHealth: number = 1100;

    axeDurability: number = 375;
    currentHatState = 0;
    game: Game;

    pickaxeSwing: Phaser.Tweens.Tween | null = null;

    constructor(scene: Game, col: number, row: number, texture: string, waveID: number) {
        super(scene, col, row, texture, waveID);
        this.game = scene;
        this.SetSpeedFirstly(20);

        this.axeDurability = 24;
        this.attackDamage = 60;

        this.capHealth = MinerHelmetZombie.maxCapHealth;

        // 添加pickaxe attackment


        const topX = this.x + this.offsetX - scene.positionCalc.GRID_SIZEX * 0.42;
        const topY = this.y - scene.positionCalc.GRID_SIZEY * 0.7 + this.offsetY;
        const pickaxe = scene.physics.add.sprite(topX, topY, 'attach/hd_pickaxe');
        pickaxe.setScale(scene.positionCalc.scaleFactor * 1.4).setOrigin(0.5, 1);
        pickaxe.setFrame(0);
        this.currentHatState = 0;
        pickaxe.debugShowBody = false;
        scene.physics.add.existing(pickaxe);
        pickaxe.setVisible(true);
        this.attachSprites.set('pickaxe', pickaxe);

        const topX2 = this.x + this.offsetX;
        const topY2 = this.y - scene.positionCalc.GRID_SIZEY * 1.15 + this.offsetY;
        const cap = scene.physics.add.sprite(topX2, topY2, 'attach/helmet');
        cap.setScale(scene.positionCalc.scaleFactor * 1.4);
        cap.setFrame(0);
        this.currentHatState = 0;
        cap.debugShowBody = false;
        scene.physics.add.existing(cap);
        cap.setVisible(true);
        this.attachSprites.set('cap', cap);

        this.setDepth(); // 所有有附加元素的,要单独设置一次
    }

    public hurtPlant(): void {
        this.axeDurability--;
        if (this.axeDurability <= 0) {
            this.axeDurability = 0;
            this.attackDamage = 10;
            this.attachSprites.get('pickaxe')?.setVisible(false);
        }
        super.hurtPlant();

    }

    public takeDamage(amount: number): void {
        if (this.capHealth > amount) {
            this.capHealth -= amount;
        } else {
            this.attachSprites.get('cap')?.setVisible(false);
            super.takeDamage(amount - this.capHealth);
            this.capHealth = 0;
        }

        if (this.capHealth > 0) {
            // 不同cap血量显示不同状态
            if (this.capHealth > MinerHelmetZombie.maxCapHealth * 2 / 3) {
                this.currentHatState = 0;
            } else if (this.capHealth > MinerHelmetZombie.maxCapHealth / 3) {
                this.currentHatState = 1;
            } else {
                this.currentHatState = 2;
            }
            this.attachSprites.get('cap')?.setFrame(this.currentHatState);

            this.game.musical.shieldHitAudio.play('ironHit');
        }
    }

    public startAttacking(plant: IPlant): void {
        // 开始动画
        if (this.axeDurability > 0) {
            if (!this.pickaxeSwing && !this.IsFrozen) {
                const sprite = this.attachSprites.get('pickaxe');
                if (this.game.tweens) {
                    this.pickaxeSwing = this.game.tweens.add({
                        targets: sprite,
                        angle: -15,           // 设置目标角度
                        duration: 200,      // 动画持续时间
                        yoyo: true,          // 启用yoyo效果
                        repeat: -1,          // 无限循环
                        ease: 'Sine.easeInOut' // 选择一个平滑的缓动函数
                    });
                }
            }
        }

        super.startAttacking(plant);
    }

    public stopAttacking(): void {
        if (this.pickaxeSwing) {
            this.pickaxeSwing.stop();
            this.pickaxeSwing = null
            // 回到位置
            this.attachSprites.get('pickaxe')?.setAngle(0);
        }
        super.stopAttacking();
    }

    setDepth() {
        // attach 不由本地管
        this.attachSprites.get('pickaxe')?.setDepth(this.baseDepth + 13); // pickaxe算比较高的
        this.attachSprites.get('cap')?.setDepth(this.baseDepth + 13); // 帽子算比较高的
        super.setDepth();
        return this;
    }
}


function NewZombie(scene: Game, col: number, row: number, waveID: number): IZombie {
    const zombie = new MinerHelmetZombie(scene, col, row, 'zombie/zombie', waveID);
    zombie.StartMove();
    return zombie;
}

const MinerHelmetZombieRecord: MIRecord = {
    mid: 5,
    name: 'MinerZombie',
    NewFunction: NewZombie,
    texture: 'zombie/zombie',
    weight: () => 2000,
    level: 5,
    leastWaveID: 13,
}

export default MinerHelmetZombieRecord;