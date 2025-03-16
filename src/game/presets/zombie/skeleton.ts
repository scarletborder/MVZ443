// src/game/sprites/NewZombie.ts
import { Game } from '../../scenes/Game';
import { IZombie } from '../../models/IZombie';
import { MIRecord } from '../../models/IRecord';
import { newNormalSkeletonAnim, newNormalZombieAnim } from '../../sprite/normal_zombie';


export class EnhancedSkeleton extends IZombie {
    constructor(scene: Game, col: number, row: number, texture: string) {
        super(scene, col, row, texture, newNormalSkeletonAnim);
        this.health = 180;
        this.SetSpeedFirstly(20 * scene.positionCalc.scaleFactor);
    }


    // 处理血量变化并更新伤口位置
    private handleHealthChange(health: number) {
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

function NewSkeleton(scene: Game, x: number, y: number): IZombie {
    const zombie = new EnhancedSkeleton(scene, x, y, 'zombie/zombie');
    zombie.StartMove();
    return zombie;
}

const SkeletonRecord: MIRecord = {
    mid: 6,
    name: 'Skeleton',
    NewFunction: NewSkeleton,
    texture: 'zombie/zombie',
}

export default SkeletonRecord;

