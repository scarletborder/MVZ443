import seedrandom from "seedrandom";
import IGolem from "../../models/IGolem";
import { MIRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";
import { ObsidianGolemAnimProps } from "../../sprite/normal_golem";
import { StartArc } from "../../utils/arc";
import IObstacle, { NewObstacleByGrid } from "../obstacle/IObstacle";
import { SECKILL } from "../../../../public/constants";
import { MonsterFactoryMap } from "..";
import { EventBus } from "../../EventBus";
import { NewLaserByGrid } from "../../models/ILaser";
import { generateBossWaveScript } from "../../game_events/stage_script";

const minerID = 4;
const helmetMinerID = 5;


class Warden extends IGolem {
    random: seedrandom.PRNG;
    // 定时器列表，用于管理所有延时任务
    timers: Phaser.Time.TimerEvent[] = [];
    private callCount: number = 0;

    constructor(scene: Game, col: number, row: number, waveID: number) {
        //TODO: 构造前,elite spawner会emit 给progress bar, boss战斗开始
        const animProps = ObsidianGolemAnimProps;
        super(scene, col, row, waveID, animProps);
        this.maxHealth = 16000;
        this.health = this.maxHealth;

        this.SetSpeedFirstly(25 * scene.positionCalc.scaleFactor);
        this.random = seedrandom.alea(String(scene.seed * 19));

        this.setVelocityX(-this.speed);
        this.anim.startLegSwing();

        // 通过封装的 addTimer 添加定时任务
        scene.music.pause();
        scene.dumpMusic = scene.music;
        scene.music = scene.sound.add('ZCDS-0014-05', { loop: true });
        scene.music.play();
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
        // 毁灭当前(col,row)
        const key = `${this.col}-${this.row}`;
        if (this.game.gardener.planted.has(key)) {
            const list = this.game.gardener.planted.get(key);
            list?.forEach(plant => {
                plant.takeDamage(SECKILL / 2);
            });
        }

        // 傻站 5 秒后开始下一步
        this.addTimer(5000, () => {
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
                // 傻站 3 秒后跳跃换位置
                this.addTimer(4500, () => {
                    this.digToNewPosition(skid === 1);
                    callback();
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
        const baseLevelSum = diff === 'low' ? 45 : 55;

        // 允许生成的怪物类型
        const allowedMobs = [1, 2, 3, 8, 4, 5, 7, 9, 11, 14];

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
                this.addTimer(20000, () => {
                    this.callCount++;
                    this.callMob(diff === 'low' ? 'high' : 'low');
                });
                return;
            }

            // 每批次生成
            const batchSize = Math.min(
                3 + Math.floor(random() * 4),
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
            const delay = 8000 + Math.floor(random() * 4000); // 8-12秒的间隔
            this.addTimer(delay, spawnBatch);
        };

        // 启动生成流程
        spawnBatch();
    }


    // 技能1: 音波攻击
    Skill1() {
        const row = this.game.positionCalc.getRowByY(this.y);
        NewLaserByGrid(this.game, 8, row, -5.5, 3500, 'plant', 1000, {},
            { invisible: false, color: 0x39c5bb, alphaFrom: 0.4, alphaTo: 0.9 });
    }


    // 技能2 薄纱当前位置,然后召唤矿工
    Skill2() {
        this.anim.highJump();
        this.game.time.delayedCall(1000, () => {
            this.anim.land();

            // 毁灭3x3范围内
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const targetCol = this.col + dx;
                    const targetRow = this.row + dy;
                    const key = `${targetCol}-${targetRow}`;

                    if (this.game.gardener.planted.has(key)) {
                        const list = this.game.gardener.planted.get(key);
                        list?.forEach(plant => {
                            plant.takeDamage(180);
                        });
                    }
                }
            }

            this.game.time.delayedCall(1000, () => {
                // 召唤士兵
                const newMinerFunc = MonsterFactoryMap[minerID].NewFunction;
                newMinerFunc(this.game, this.col, this.row, -10);
                const newHelmetMinerFunc = MonsterFactoryMap[helmetMinerID].NewFunction;
                newHelmetMinerFunc(this.game, this.col, this.row, -10);
            });
        });




    }


    // 流程, 傻站5s,挥舞手臂轮流释放技能1,2,释放完毕后停止挥舞手臂,傻站3s,跳跃换位置(从当前monster删除自己,再在新的地方注册自己)


    // 钻地换位置：删除当前注册，跳到新位置后重新注册
    // isBack: 是否在器械的后排位置(突袭)
    digToNewPosition(isBack: boolean = false) {
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
        const newcol = isBack ? 3 : 8;
        const { x, y } = this.game.positionCalc.getZombieBottomCenter(newcol, newRow);
        this.digTo(x, y);

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
            amount *= 0.5;
            amount = Math.min(amount, 1500);
        } else if (projectileType === 'laser' && amount > 500) {
            amount = 500;
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
        this.game.music.stop();
        if (this.game.dumpMusic) {
            this.game.music = this.game.dumpMusic;
            this.game.music.resume();
        }

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
    addTimer(delay: number, callback: () => void): Phaser.Time.TimerEvent {
        const timer = this.game.time.delayedCall(delay, () => {
            // 回调执行完毕后从列表中删除
            callback();
            this.removeTimer(timer);
        }, [], this);
        this.timers.push(timer);
        return timer;
    }

    // 移除定时器
    removeTimer(timer: Phaser.Time.TimerEvent) {
        const index = this.timers.indexOf(timer);
        if (index !== -1) {
            this.timers.splice(index, 1);
        }
    }

    // 清空所有定时器（用于销毁时）
    clearAllTimers() {
        this.timers.forEach(timer => {
            timer.remove(false);
        });
        this.timers = [];
    }

}


function NewWarden(scene: Game, col: number, row: number, waveID: number): IGolem {
    const golem = new Warden(scene, col, row, waveID);
    return golem;
}

const WardenRecord: MIRecord = {
    mid: 13,
    name: 'Warden',
    NewFunction: NewWarden,
    texture: 'zombie/zombie',
    weight: () => 0,
    level: 999,
    leastWaveID: 0,
}

export default WardenRecord;