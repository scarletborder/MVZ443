import seedrandom from "seedrandom";
import { MIRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";
import { ObsidianGolemAnimProps } from "../../sprite/normal_golem";
import { StartArc } from "../../utils/arc";
import IObstacle, { NewObstacleByGrid } from "../obstacle/IObstacle";
import { SECKILL } from "../../../../public/constants";
import { MonsterFactoryMap } from "..";
import { EventBus } from "../../EventBus";
import { generateBossWaveScript } from "../../game_events/stage_script";
import IGolem from "../../models/monster/IGolem";
import { FrameTimer } from "../../sync/ticker";

const soliderID = 11;

class ObsidianGolem extends IGolem {
    random: seedrandom.PRNG;
    // 定时器列表，用于管理所有延时任务
    timers: FrameTimer[] = [];
    callCount: number = 0;

    constructor(scene: Game, col: number, row: number, waveID: number) {
        //TODO: 构造前,elite spawner会emit 给progress bar, boss战斗开始
        const animProps = ObsidianGolemAnimProps;
        super(scene, col, row, waveID, animProps);
        this.SetHealthFirsty(12000);

        this.SetSpeedFirstly(25);
        this.random = seedrandom.alea(String(scene.seed * 7));

        this.setVelocityX(-this.speed);
        this.anim.startLegSwing();

        // 通过封装的 addTimer 添加定时任务
        scene.musical.coverCurrent('bgm1');
        this.addTimer(2500, () => {
            this.StandUp();
        });
    }


    // step1: 站立并且开始刷怪,切换bgm，进入后续流程
    StandUp() {
        // 停止初始移动和动画
        this.anim.stopLegSwing();
        this.setVelocityX(0);
        // TODO: 切换BGM等

        // 如果有其他刷怪逻辑，也可以在这里调用 callMob(diff)
        // 例如：this.callMob('low');

        // 启动boss完整流程（站立->技能周期->跳跃换位置->重复）

        this.startBossProcessCycle();
        // 定时刷怪
        this.callMob('low');

    }

    // 定义一轮流程
    doRound(skid: number, callback: () => void) {
        // 傻站 5 秒后开始下一步
        this.addTimer(7000, () => {

            // 开始挥舞手臂（如果有专门的动画方法）
            if (this.anim.startArmSwing) {
                this.anim.startArmSwing();
            }
            // 释放技能1 / 2
            if (skid === 1) this.Skill1();
            if (skid === 2) this.Skill2();

            // 假设技能动画大约 2200ms 后结束
            this.addTimer(3200, () => {
                // 停止挥舞手臂
                if (this.anim.stopArmSwing) {
                    this.anim.stopArmSwing();
                }
                // 傻站 2 秒后跳跃换位置
                this.addTimer(2000, () => {
                    this.jumpToNewPosition(callback);
                });
            });
        });
    }

    // boss 流程周期：两轮后重复
    startBossProcessCycle() {
        this.doRound(1, () => {
            this.doRound(2, () => {
                this.startBossProcessCycle();
            });
        });
    }

    // 生成怪物
    callMob(diff: 'low' | 'high') {
        const random = this.random;

        // 根据难度确定基础难度总和
        const baseLevelSum = diff === 'low' ? 38 : 48;

        // 允许生成的怪物类型
        const allowedMobs = [1, 2, 3, 8, 5, 7, 9, 11, 14, 15, 16];

        // 生成怪物列表
        const monsterRecords = generateBossWaveScript(
            baseLevelSum,
            random,
            allowedMobs,
            this.callCount
        );

        // 展开怪物列表为单个怪物ID数组
        const monsterIds: number[] = [];
        monsterRecords.forEach(record => {
            for (let i = 0; i < record.count; i++) {
                monsterIds.push(record.mid);
            }
        });

        // 打乱怪物顺序
        for (let i = monsterIds.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [monsterIds[i], monsterIds[j]] = [monsterIds[j], monsterIds[i]];
        }

        // 分批次生成怪物
        const spawnBatch = () => {
            if (monsterIds.length === 0) {
                // 怪物全部生成完毕,等待后继续下一轮
                this.addTimer(5000, () => {
                    this.callCount++;
                    this.callMob(diff === 'low' ? 'high' : 'low');
                });
                return;
            }

            // 每批次生成
            const batchSize = Math.min(
                4 + Math.floor(random() * 4),
                monsterIds.length // 不超过剩余数量
            );

            // 生成这一批怪物
            for (let i = 0; i < batchSize; i++) {
                const mobId = monsterIds[i];
                const row = this.game.positionCalc.getRandomRow(random());
                const mobFunc = MonsterFactoryMap[mobId].NewFunction;
                mobFunc(this.game, 9, row, -10);
            }

            // 移除已生成的怪物ID
            monsterIds.splice(0, batchSize);

            // 继续生成下一批
            const delay = 5000 + Math.floor(random() * 3000); // 8-12秒的间隔
            this.addTimer(delay, spawnBatch);
        };

        // 启动生成流程
        spawnBatch();
    }


    // 技能1: 在场上前排位置空降row排列(横向)黑曜石,碾压器械,抵挡bullet
    Skill1() {
        const row = this.game.positionCalc.getRowByY(this.y);
        const cols = [7, 5, 3];
        let wait = 800;
        let height = 200;
        cols.forEach(col => {
            const { x: tmpx, y: tmpy } = this.game.positionCalc.getPlantBottomCenter(col, row);

            if (!this.hasObstacle(col, row)) {
                StartArc(this.game, this.x, this.y, tmpx, tmpy, 'zombie/mob_obsidian', wait, () => {
                    NewObstacleByGrid(this.game, col, row, -10, 'zombie/mob_obsidian', {
                        health: 300,
                        onDestory: () => { }
                    });
                    const key = `${col}-${row}`;
                    if (this.game.gardener.planted.has(key)) {
                        const list = this.game.gardener.planted.get(key);
                        if (list) {
                            const copy_list = [...list];
                            copy_list.forEach(plant => {
                                plant.takeDamage(SECKILL / 2);
                            });
                        }
                    }
                }, height);
            }
            wait += 600;
            height += 100;
        });
    }


    // 技能2 同时三列召唤黑曜石(每row中间位置碾压)+卫道士兵
    Skill2() {
        const newCol = 6;
        const newRows = [this.row];
        if (this.row !== 0) {
            newRows.push(this.row - 1);
        }
        if (this.row !== this.game.GRID_ROWS - 1) {
            newRows.push(this.row + 1);
        }

        const wait = 1200;
        const height = 250;
        newRows.forEach(row => {
            const { x: tmpx, y: tmpy } = this.game.positionCalc.getPlantBottomCenter(newCol, row);

            if (!this.hasObstacle(newCol, row)) {
                StartArc(this.game, this.x, this.y, tmpx, tmpy, 'zombie/mob_obsidian', wait, () => {
                    NewObstacleByGrid(this.game, newCol, row, -10, 'zombie/mob_obsidian', {
                        health: 500,
                        onDestory: () => { }
                    });
                    const key = `${newCol}-${row}`;
                    if (this.game.gardener.planted.has(key)) {
                        const list = this.game.gardener.planted.get(key);
                        if (list) {
                            const copy_list = [...list];
                            copy_list.forEach(plant => {
                                plant.takeDamage(SECKILL / 2);
                            });
                        }
                    }
                }, height);
            }

            // 召唤士兵
            const newSoliderFunc = MonsterFactoryMap[soliderID].NewFunction;
            newSoliderFunc(this.game, newCol + 1, row, -10);
        });
    }


    // 流程, 傻站5s,挥舞手臂轮流释放技能1,2,释放完毕后停止挥舞手臂,傻站3s,跳跃换位置(从当前monster删除自己,再在新的地方注册自己)


    // 跳跃换位置：删除当前注册，跳到新位置后重新注册
    jumpToNewPosition(callback: () => void) {
        const key = `${this.row}`;
        if (this.Spawner.monstered.has(key)) {
            const list = this.Spawner.monstered.get(key);
            if (list) {
                const index = list.indexOf(this);
                if (index >= 0) {
                    list.splice(index, 1);
                }
                if (list.length === 0) {
                    this.Spawner.monstered.delete(key);
                }
            }
        }

        // 寻找新的位置（保证新行与当前不相同）
        let newRow = this.row;
        while (newRow === this.row) {
            const rnd = this.random();
            newRow = Math.floor(this.game.GRID_ROWS * rnd);
        }
        const newcol = 8;
        const { x, y } = this.game.positionCalc.getZombieBottomCenter(newcol, newRow);

        if (this && this.game) this.game.physics.world.disable(this);
        this.jumpTo(x, y, 3500, 120 * Math.abs(newRow - this.row));
        this.game.time.delayedCall(3500, () => {
            if (this && this.game) {
                this.game.physics.world.enable(this); // 启用物理体
                callback();
            }
        });

        // 更新注册信息
        this.row = newRow;
        this.col = newcol;
        this.Spawner.registerMonster(this);
    }


    update(): void {
        super.update();
    }

    public takeDamage(amount: number, projectileType?: "bullet" | "laser" | "explosion" | "trajectory"): void {
        if (projectileType === 'explosion') {
            amount *= 0.25;
            amount = Math.min(amount, 1500);
        } else if (projectileType === 'laser' && amount > 500) {
            amount = 500;
        } else {
            amount *= 0.8;
        }
        super.takeDamage(amount);
    }

    // sethealth, 把进度广播给progress bar
    setHealth(value: number) {
        console.log('setHealth', value, 'percent', this.health * 100 / this.maxHealth);
        super.setHealth(value);
        // TODO: 广播给progress bar
        EventBus.emit('boss-health', { health: this.health * 100 / this.maxHealth });
    }

    destoryZombie(): void {
        this.clearAllTimers();
        this.game.musical.backToDump();

        super.destoryZombie();
        EventBus.emit('boss-health', { health: -1 }); // death
    }

    // 判断(col,row是否已经有obstacle,防止重复放置)
    hasObstacle(col: number, row: number): boolean {
        const key = `${row}`;
        if (this.game.monsterSpawner.monstered.has(key)) {
            const list = this.game.monsterSpawner.monstered.get(key);
            if (list) {
                for (const obsidian of list) {
                    if (obsidian instanceof IObstacle && obsidian.col === col) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // 封装定时器添加方法
    addTimer(delay: number, callback: () => void): FrameTimer {
        const timer = this.game.frameTicker.delayedCall({
            delay: delay,
            callback: () => {
                // 回调执行完毕后从列表中删除
                callback();
                this.removeTimer(timer);
            }
        });
        this.timers.push(timer);
        return timer;
    }

    // 移除定时器
    removeTimer(timer: FrameTimer) {
        const index = this.timers.indexOf(timer);
        if (index !== -1) {
            this.timers.splice(index, 1);
        }
    }

    // 清空所有定时器（用于销毁时）
    clearAllTimers() {
        this.timers.forEach(timer => {
            timer.remove();
        });
        this.timers = [];
    }

}


function NewObsidianGolem(scene: Game, col: number, row: number, waveID: number): IGolem {
    const golem = new ObsidianGolem(scene, col, row, waveID);
    return golem;
}

const ObsidianRecord: MIRecord = {
    mid: 12,
    name: 'Obsidian Golem',
    NewFunction: NewObsidianGolem,
    texture: 'zombie/zombie',

    weight: () => 0,
    level: 999,
    leastWaveID: 0,
}

export default ObsidianRecord;