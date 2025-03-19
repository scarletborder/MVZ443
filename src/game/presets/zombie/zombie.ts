// src/game/sprites/NewZombie.ts
import { Game } from '../../scenes/Game';
import { IZombie } from '../../models/IZombie';
import { MIRecord } from '../../models/IRecord';
import { newNormalZombieAnim } from '../../sprite/normal_zombie';


export class EnhancedZombie extends IZombie {
    constructor(scene: Game, col: number, row: number, texture: string, waveID: number) {
        super(scene, col, row, texture, waveID, newNormalZombieAnim);
        this.health = 300;
        this.SetSpeedFirstly(20 * scene.positionCalc.scaleFactor);
    }


    // 处理血量变化并更新伤口位置
    private handleHealthChange(health: number) {
        if (this.health <= 150 && this.health > 0) {
            this.zombieAnim.switchBodyFrame(true);
        } else if (this.health > 150) {
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

function NewZombie(scene: Game, col: number, row: number, waveID: number): IZombie {
    const zombie = new EnhancedZombie(scene, col, row, 'zombie/zombie', waveID);
    zombie.StartMove();
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

