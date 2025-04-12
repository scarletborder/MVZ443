// src/game/sprites/NewZombie.ts
import { Game } from '../../scenes/Game';
import { IZombie } from '../../models/monster/IZombie';
import { MIRecord } from '../../models/IRecord';
import { newNormalEvokerAnim } from '../../sprite/normal_zombie';
import { MonsterFactoryMap } from '..';
import { FrameTimer } from '../../sync/ticker';


export class EnhancedEvoker extends IZombie {
    Timer: FrameTimer;
    summonTimes: number = 3;
    scene: Game;

    constructor(scene: Game, col: number, row: number, texture: string, waveID: number) {
        super(scene, col, row, texture, waveID, newNormalEvokerAnim);
        this.health = 400;
        this.summonTimes = 3;
        this.scene = scene;
        this.attackDamage = 20;
        this.SetSpeedFirstly(25);

        this.Timer = scene.frameTicker.addEvent({
            delay: 28000,
            startAt: 24000,
            callback: () => {
                if (this.hasDebuff('frozen') === 0) this.summonVindicator();
            },
            repeat: 3,
        });
    }

    private summonVindicator() {
        if (!this.scene) return;

        this.stopAttacking();
        this.StopMove();
        this.zombieAnim.stopLegSwing();
        this.zombieAnim.startArmDance();
        let col = this.scene.positionCalc.getColByX(this.x);
        let row = this.scene.positionCalc.getRowByY(this.y);
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
        this.scene?.frameTicker.delayedCall({
            delay: 3000,
            callback: () => {
                if (this && this.health > 0) {
                    this.zombieAnim.stopArmSwing();
                    this.zombieAnim.startLegSwing();
                    if (this.hasDebuff('frozen') === 0) this.StartMove();
                }
            }
        });
    }

    private addVindicator(col: number, row: number): IZombie {
        if (row < 0) row = 0;
        if (row > this.scene.positionCalc.Row_Number - 1) row = this.scene.positionCalc.Row_Number - 1;
        const vindicatorMid = 10;
        const summon_mob = MonsterFactoryMap[vindicatorMid].NewFunction(this.scene, col, row, -10) as IZombie; // -10 标记为召唤出来的怪物
        summon_mob.StopMove();

        this.scene.time.delayedCall(2000, () => {
            if (summon_mob && summon_mob.health > 0 && summon_mob.hasDebuff('frozen') === 0) {
                summon_mob.StartMove();
            }
        });
        return summon_mob;
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

function NewEvoker(scene: Game, col: number, row: number, waveID: number): IZombie {
    if (row < 0) row = 0;
    if (row > scene.positionCalc.Row_Number - 1) row = scene.positionCalc.Row_Number - 1;
    const zombie = new EnhancedEvoker(scene, col, row, 'zombie/zombie', waveID);
    zombie.StartMove();
    return zombie;
}

const EvokerRecord: MIRecord = {
    mid: 9,
    name: 'evoker',
    NewFunction: NewEvoker,
    texture: 'zombie/zombie',
    weight: () => 1000,
    level: 5,
    leastWaveID: 10,
}

export default EvokerRecord;

