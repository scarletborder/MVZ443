// 撑杆跳僵尸

// 在持有stick的时候,第一次碰撞将会触发翻越动画,并忽视这个器械,同时isFly= true,状态结束后false
import { IPlant } from "../../models/IPlant";
import { MIRecord } from "../../models/IRecord";
import { IZombie } from "../../models/IZombie";
import { Game } from "../../scenes/Game";
import { EnhancedZombie } from "./zombie";

class StickZombie extends EnhancedZombie {
    hasStick: boolean = true;
    game: Game;
    vaultTargetX: number = 0;  // Target position for vaulting

    constructor(scene: Game, col: number, row: number, texture: string, waveID: number) {
        super(scene, col, row, texture, waveID);
        this.SetSpeedFirstly(40 * scene.positionCalc.scaleFactor);
        this.hasStick = true;
        this.attackDamage = 30;
        this.game = scene;

        // add stick attackment


        const topX = this.x + this.offsetX - scene.positionCalc.GRID_SIZEX * 0.42;
        const topY = this.y - scene.positionCalc.GRID_SIZEY * 0.7 + this.offsetY;
        const stick = scene.physics.add.sprite(topX, topY, 'attach/hd_stick');
        stick.setScale(scene.positionCalc.scaleFactor * 1.4).setOrigin(0.5, 1);
        scene.physics.add.existing(stick);
        stick.setVisible(true);
        this.attachSprites.set('stick', stick);

        this.setDepth(); // 所有有附加元素的,要单独设置一次
    }

    public startAttacking(plant: IPlant): void {
        if (this.hasStick) {
            this.hasStick = false;
            // 进行翻阅操作
            this.vaultTargetX = this.game.positionCalc.gridOffsetX + (plant.col - 0.2) * this.game.positionCalc.GRID_SIZEX;
            this.isFlying = true;
        } else if (this.isFlying) {
            return; // 正在飞行中,不进行攻击
        } else {
            // 已经恢复正常
            super.startAttacking(plant);
        }
    }

    update(): void {
        if (this.x < this.vaultTargetX && this.isFlying) {
            // 越过了
            this.isFlying = false;
            this.attachSprites.get('stick')?.setVisible(false);
            // 减速
            this.SetSpeedFirstly(20 * this.game.positionCalc.scaleFactor);
            if (this.health > 0 && !this.IsFrozen) {
                this.setVelocityX(-this.speed);
            }
        }
        if (this.isFlying) {
            this.zombieAnim.updatePosition(this.x + this.offsetX,
                this.y + this.offsetY - this.game.positionCalc.GRID_SIZEY * 0.4);
        } else {
            super.update();
        }
    }

    setDepth() {
        // attach 不由本地管
        this.attachSprites.get('stick')?.setDepth(this.baseDepth + 13);
        super.setDepth();
        return this;
    }
}


function NewZombie(scene: Game, x: number, y: number, waveID: number): IZombie {
    const zombie = new StickZombie(scene, x, y, 'zombie/zombie', waveID);
    zombie.StartMove();
    return zombie;
}

const StickZombieRecord: MIRecord = {
    mid: 8,
    name: 'StickZombie',
    NewFunction: NewZombie,
    texture: 'zombie/zombie',
}

export default StickZombieRecord;