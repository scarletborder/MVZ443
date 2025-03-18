// src/game/sprites/NewZombie.ts
import { Game } from '../../scenes/Game';
import { IZombie } from '../../models/IZombie';
import { MIRecord } from '../../models/IRecord';
import { newNormalEvokerAnim } from '../../sprite/normal_zombie';
import MonsterFactoryMap from '.';


export class EnhancedEvoker extends IZombie {
    Timer: Phaser.Time.TimerEvent;
    summonTimes: number = 3;
    scene: Game;

    constructor(scene: Game, col: number, row: number, texture: string) {
        super(scene, col, row, texture, newNormalEvokerAnim);
        this.health = 320;
        this.summonTimes = 3;
        this.scene = scene;
        this.attackDamage = 15;
        this.SetSpeedFirstly(25 * scene.positionCalc.scaleFactor);

        this.Timer = scene.time.addEvent({
            delay: 24000,
            startAt: 20000,
            callback: () => {
                if (this.hasDebuff('frozen') === 0) this.summonVindicator();
            },
            repeat: 5,
        });
    }

    private summonVindicator() {
        this.stopAttacking();
        this.StopMove();
        this.zombieAnim.stopLegSwing();
        this.zombieAnim.startArmDance();
        let { col, row } = this.scene.positionCalc.getGridByPos(this.x, this.y);
        row -= 1; // 修正位置
        // 判断四个方向的坐标是否合法
        const summons: IZombie[] = [];
        if (row - 1 >= 0) {
            summons.push(this.addVindicator(col, row - 1));
        }
        if (row + 1 < this.scene.positionCalc.Row_Number) {
            summons.push(this.addVindicator(col, row + 1));
        }
        if (this.x > this.scene.positionCalc.gridOffsetX + this.scene.positionCalc.GRID_SIZEX * 2) {
            summons.push(this.addVindicator(col - 1, row));
        }
        summons.push(this.addVindicator(col + 1, row));
        this.game.time.delayedCall(2500, () => {
            if (this && this.health > 0) {
                this.zombieAnim.stopArmSwing();
                this.zombieAnim.startLegSwing();
                if (this.hasDebuff('frozen') === 0) this.StartMove();

                for (const summon of summons) {
                    if (summon && summon.health > 0 && summon.hasDebuff('frozen') === 0) {
                        summon.StartMove();
                        summon.zombieAnim.startLegSwing();
                    }
                }
            }
        });
    }

    private addVindicator(col: number, row: number) {

        const vindicatorMid = 10;
        const mob = MonsterFactoryMap[vindicatorMid].NewFunction(this.scene, col, row);
        mob.summoned = true; // 标记为召唤出来的怪物
        mob.zombieAnim.stopLegSwing();
        mob.StopMove()
        return mob;
    }

    // 处理血量变化并更新伤口位置
    private handleHealthChange(health: number) {
        if (this.health <= 160 && this.health > 0) {
            this.zombieAnim.switchBodyFrame(true);
        } else if (this.health > 160) {
            this.zombieAnim.switchBodyFrame(false);
        }
    }

    public takeDamage(amount: number): void {
        super.takeDamage(amount);
        this.handleHealthChange(this.health);
    }

    playDeathAnimation(): void {
        super.playDeathAnimation();
    }

    destroy(fromScene?: boolean): void {
        this.Timer.remove();
        super.destroy(fromScene);
    }
}

function NewEvoker(scene: Game, x: number, y: number): IZombie {
    const zombie = new EnhancedEvoker(scene, x, y, 'zombie/zombie');
    zombie.StartMove();
    return zombie;
}

const EvokerRecord: MIRecord = {
    mid: 9,
    name: 'evoker',
    NewFunction: NewEvoker,
    texture: 'zombie/zombie',
}

export default EvokerRecord;

