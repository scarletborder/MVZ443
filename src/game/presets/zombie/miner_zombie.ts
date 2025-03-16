// 在pickaxe 耐久用完之前,伤害非常高

import { IPlant } from "../../models/IPlant";
import { MIRecord } from "../../models/IRecord";
import { IZombie } from "../../models/IZombie";
import { Game } from "../../scenes/Game";
import { EnhancedZombie } from "./zombie";

class MinerZombie extends EnhancedZombie {
    axeDurability: number = 375;
    currentHatState = 0;
    game: Game;

    pickaxeSwing: Phaser.Tweens.Tween | null = null;

    constructor(scene: Game, col: number, row: number, texture: string) {
        super(scene, col, row, texture);
        this.speed = 20 * scene.positionCalc.scaleFactor;
        this.axeDurability = 32;
        this.attackDamage = 60;
        this.game = scene;

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

    public startAttacking(plant: IPlant): void {
        // 开始动画
        if (this.axeDurability > 0) {
            if (!this.pickaxeSwing) {
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
        this.attachSprites.get('pickaxe')?.setDepth(this.baseDepth + 13); // 帽子算比较高的
        super.setDepth();
        return this;
    }
}


function NewZombie(scene: Game, x: number, y: number): IZombie {
    const zombie = new MinerZombie(scene, x, y, 'zombie/zombie');
    zombie.StartMove();
    return zombie;
}

const MinerZombieRecord: MIRecord = {
    mid: 4,
    name: 'MinerZombie',
    NewFunction: NewZombie,
    texture: 'zombie/zombie',
}

export default MinerZombieRecord;