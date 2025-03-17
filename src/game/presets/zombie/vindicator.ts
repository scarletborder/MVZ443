// src/game/sprites/NewZombie.ts
import { Game } from '../../scenes/Game';
import { IZombie } from '../../models/IZombie';
import { MIRecord } from '../../models/IRecord';
import { newNormalVindicatorAnim } from '../../sprite/normal_zombie';
import { IPlant } from '../../models/IPlant';


export class EnhancedVindicator extends IZombie {
    axeSwing: Phaser.Tweens.Tween | null = null;

    constructor(scene: Game, col: number, row: number, texture: string) {
        super(scene, col, row, texture, newNormalVindicatorAnim);
        this.health = 220;
        this.attackDamage = 45;
        this.SetSpeedFirstly(30 * scene.positionCalc.scaleFactor);

        const topX = this.x + this.offsetX - scene.positionCalc.GRID_SIZEX * 0.42;
        const topY = this.y - scene.positionCalc.GRID_SIZEY * 0.7 + this.offsetY;
        const axe = scene.physics.add.sprite(topX, topY, 'attach/hd_axe');
        axe.setScale(scene.positionCalc.scaleFactor * 1.4).setOrigin(0.5, 1);
        axe.debugShowBody = false;
        scene.physics.add.existing(axe);
        axe.setVisible(true);
        this.attachSprites.set('axe', axe);

        this.setDepth(); // 所有有附加元素的,要单独设置一次
    }


    // 处理血量变化并更新伤口位置
    private handleHealthChange(health: number) {
        if (this.health <= 110 && this.health > 0) {
            this.zombieAnim.switchBodyFrame(true);
        } else if (this.health > 110) {
            this.zombieAnim.switchBodyFrame(false);
        }
        // <0 给到别的逻辑处理
    }

    public takeDamage(amount: number): void {
        super.takeDamage(amount);
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
        super.setDepth();
        return this;
    }
}

function NewVindicator(scene: Game, x: number, y: number): IZombie {
    const zombie = new EnhancedVindicator(scene, x, y, 'zombie/zombie');
    zombie.StartMove();
    return zombie;
}

const VindicatorRecord: MIRecord = {
    mid: 6,
    name: 'Vindicator',
    NewFunction: NewVindicator,
    texture: 'zombie/zombie',
}

export default VindicatorRecord;

