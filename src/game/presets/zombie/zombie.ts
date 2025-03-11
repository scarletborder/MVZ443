// src/game/sprites/NewZombie.ts
import { Game } from '../../scenes/Game';
import { IZombie } from '../../models/IZombie';
import { MIRecord } from '../../models/IRecord';
import { newNormalZombieAnim } from '../../sprite/normal_zombie';


export class EnhancedZombie extends IZombie {
    constructor(scene: Game, col: number, row: number, texture: string) {
        super(scene, col, row, texture, newNormalZombieAnim);
        // TODO: Y 根据真实offset进行修改
        // let x = this.x + 10 * scene.positionCalc.scaleFactor;
        // let y = this.y - 50 * scene.positionCalc.scaleFactor;


        this.health = 200;
        this.speed = 20 * scene.positionCalc.scaleFactor;
    }


    // 处理血量变化并更新伤口位置
    private handleHealthChange(health: number) {
        console.log(`Zombie health updated to: ${this.health}`);
        if (this.health <= 100 && this.health > 0) {
            this.zombieAnim.switchBodyFrame(true);
        } else if (this.health > 100) {
            this.zombieAnim.switchBodyFrame(false);
        }
        // <0 给到别的逻辑处理
    }

    public takeDamage(amount: number): void {
        super.takeDamage(amount);
        this.handleHealthChange(this.health);
    }

    playDeathAnimation(): void {
        super.playDeathAnimation();
    }

    destroy(fromScene?: boolean): void {
        super.destroy(fromScene);
    }
}

function NewZombie(scene: Game, x: number, y: number): IZombie {
    const zombie = new EnhancedZombie(scene, x, y, 'zombie/zombie');

    zombie.setVelocityX(-zombie.speed); // 初始向左移动

    console.log('New Zombie created');
    return zombie;
}

const zombieRecord: MIRecord = {
    mid: 1,
    name: 'Zombie',
    NewFunction: NewZombie,
    texture: 'zombie/zombie',
}

export default zombieRecord;

