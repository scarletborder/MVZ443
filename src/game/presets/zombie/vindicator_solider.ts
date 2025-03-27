// src/game/sprites/NewZombie.ts
import { Game } from '../../scenes/Game';
import { IZombie } from '../../models/monster/IZombie';
import { MIRecord } from '../../models/IRecord';
import { newNormalVindicatorAnim } from '../../sprite/normal_zombie';
import { IPlant } from '../../models/IPlant';


export class EnhancedVindicator extends IZombie {
    static maxShieldHealth: number = 990;
    shieldHealth: number = 1000;
    currentShieldState = 0; // 0 = normal. 1 = broken

    axeSwing: Phaser.Tweens.Tween | null = null;

    constructor(scene: Game, col: number, row: number, texture: string, waveID: number) {
        super(scene, col, row, texture, waveID, newNormalVindicatorAnim);
        this.health = 360;
        this.shieldHealth = EnhancedVindicator.maxShieldHealth;
        this.attackDamage = 32;
        this.SetSpeedFirstly(15);

        const topX = this.x + this.offsetX - scene.positionCalc.GRID_SIZEX * 0.42;
        const topY = this.y - scene.positionCalc.GRID_SIZEY * 0.7 + this.offsetY;
        const axe = scene.physics.add.sprite(topX, topY, 'attach/hd_axe');
        axe.setScale(scene.positionCalc.scaleFactor * 1.4).setOrigin(0.5, 1);
        axe.debugShowBody = false;
        scene.physics.add.existing(axe);
        axe.setVisible(true);
        this.attachSprites.set('axe', axe);

        const shield = scene.physics.add.sprite(topX, topY, 'attach/hd_shield');
        shield.setScale(scene.positionCalc.scaleFactor * 2.2).setOrigin(0.5, 0.35);
        shield.debugShowBody = false;
        this.currentShieldState = 0;
        shield.setFrame(0);
        scene.physics.add.existing(shield);
        shield.setVisible(true);
        this.attachSprites.set('shield', shield);

        this.setDepth(); // 所有有附加元素的,要单独设置一次
    }


    // 处理血量变化并更新伤口位置
    private handleHealthChange(health: number) {
        if (this.health <= 180 && this.health > 0) {
            this.zombieAnim.switchBodyFrame(true);
        } else if (this.health > 180) {
            this.zombieAnim.switchBodyFrame(false);
        }
        // <0 给到别的逻辑处理
    }

    public takeDamage(amount: number, projectileType?: "bullet" | "laser" | "explosion" | "trajectory"): void {
        if (projectileType !== 'laser' && projectileType !== 'trajectory') { // 激光,投掷物穿透盾牌
            if (this.shieldHealth > amount) {
                amount *= 0.75;
                this.shieldHealth -= amount;
            } else {
                this.attachSprites.get('shield')?.setVisible(false);
                super.takeDamage(amount - this.shieldHealth, projectileType);
                this.shieldHealth = 0;
            }

            // 不同shield血量显示不同状态
            if (this.shieldHealth > 0) {
                if (this.shieldHealth > EnhancedVindicator.maxShieldHealth / 2) {
                    this.currentShieldState = 0;
                } else {
                    this.currentShieldState = 1;
                }
                this.attachSprites.get('shield')?.setFrame(this.currentShieldState);
            }
        } else {
            // laser
            super.takeDamage(amount, projectileType);
        }
        this.handleHealthChange(this.health);
    }

    public startAttacking(plant: IPlant): void {
        // 开始动画

        if (!this.axeSwing) {
            const sprite = this.attachSprites.get('axe');
            if (this.game.tweens) {
                this.axeSwing = this.game.tweens.add({
                    targets: sprite,
                    angle: -15,           // 设置目标角度
                    duration: 200,      // 动画持续时间
                    yoyo: true,          // 启用yoyo效果
                    repeat: -1,          // 无限循环
                    ease: 'Sine.easeInOut' // 选择一个平滑的缓动函数
                });
            }
        }


        super.startAttacking(plant);
    }

    public stopAttacking(): void {
        if (this.axeSwing) {
            this.axeSwing.stop();
            this.axeSwing = null;
            this.attachSprites.get('axe')?.setAngle(0);
        }
        super.stopAttacking();
    }

    playDeathAnimation(): void {
        super.playDeathAnimation();
    }

    destroy(fromScene?: boolean): void {
        super.destroy(fromScene);
    }

    setDepth() {
        // attach 不由本地管
        this.attachSprites.get('axe')?.setDepth(this.baseDepth + 13); // 帽子算比较高的
        this.attachSprites.get('shield')?.setDepth(this.baseDepth + 14);
        super.setDepth();
        return this;
    }
}

function NewVindicator(scene: Game, x: number, y: number, waveID: number): IZombie {
    const zombie = new EnhancedVindicator(scene, x, y, 'zombie/zombie', waveID);
    zombie.StartMove();
    return zombie;
}

const VindicatorSoliderRecord: MIRecord = {
    mid: 11,
    name: 'VindicatorSolider',
    NewFunction: NewVindicator,
    texture: 'zombie/zombie',
    weight: () => 3500,
    level: 4,
    leastWaveID: 14,
}

export default VindicatorSoliderRecord;

