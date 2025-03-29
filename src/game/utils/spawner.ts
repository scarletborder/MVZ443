import { Wave } from "../models/IRecord";
import { IZombie } from "../models/monster/IZombie";
import { Game } from "../scenes/Game";
import { MonsterFactoryMap } from "../presets";
import seedrandom from 'seedrandom';
import { EventBus } from "../EventBus";
import { GroundOnlyZombie, SkyOnlyZombie, WaterOnlyZombie } from "./grid_clan";
import { IMonster } from "../models/monster/IMonster";
import IObstacle from "../presets/obstacle/IObstacle";
// 出怪实例
// 使用一个刷怪表进行实例化

export default class MonsterSpawner {
    public scene: Game;
    monstered: Map<string, Array<IMonster | IObstacle>> = new Map();
    // Add to class properties
    private rowCache: Map<number, number[]> = new Map();  // mid -> valid rows

    private SeedRandom: seedrandom.PRNG;

    private waves: Wave[];
    private wavesLeng: number;
    private current_wave_idx: number = 0;

    private SpawnTimer: Phaser.Time.TimerEvent; // 出怪
    private Timer: Phaser.Time.TimerEvent; // 波数
    private prev_wave_time: number = 0;

    private tmpKilled_count = 0;// 两波之间存击杀数
    private killed_count = 0; // 怪物击杀数
    private total_count = 0; // 怪物总数

    public progress: number = 0; // 进度

    private bossObj: IZombie | null = null; // boss对象,如果有最后一波boss,监听boss存活,
    // BOSS死亡自动emit游戏胜利,不再做胜利判断


    constructor(game: Game, waves_json: any, randomSeed?: number) {
        this.scene = game;
        this.waves = waves_json;
        this.wavesLeng = this.waves.length;
        if (!randomSeed) randomSeed = Math.random();
        this.setRandomSeed(randomSeed);
    }
    // TODO: 追加新的波数, 例如精英关卡开启


    currentWave() {
        return this.waves[this.current_wave_idx];
    }

    setRandomSeed(seed: number) {
        this.SeedRandom = seedrandom.alea(String(seed))
    }

    // 整局,触发开始,一局游戏只能调用一次
    startWave() {
        if (this.Timer) {
            this.Timer.remove();
            this.Timer.destroy();
        }
        if (this.SpawnTimer) {
            this.SpawnTimer.remove();
            this.SpawnTimer.destroy();
        }

        this.progress = 0;
        this.current_wave_idx = -1;
        this.killed_count = 0;
        this.total_count = 0;
        this.nextWave();
    }

    // Next
    nextWave() {
        console.log('time now:', this.scene.time.now);
        // // 停用当前一切计时器
        // if (this.Timer) {
        //     this.Timer.remove();
        //     this.Timer.destroy();
        // }

        // 无论如何都到达了下一波,那么开始进度记录
        if (this.current_wave_idx >= 0) {
            // 第一波之后(idx>0),播报当前进度
            this.progress = this.currentWave().progress; // 上一波的进度到达完成!
            this.scene.broadCastProgress(this.currentWave().progress);
        }

        this.current_wave_idx++;

        // 定期波数的额外设置
        if (this.scene.extraFunc.has(this.current_wave_idx)) {
            const func = this.scene.extraFunc.get(this.current_wave_idx);
            if (func) {
                func(this.scene, this.current_wave_idx);
                this.scene.extraFunc.delete(this.current_wave_idx); // 删除已执行的函数
            }
        }

        console.log('next wave', this.current_wave_idx, '/', this.wavesLeng);
        if (this.current_wave_idx >= this.waves.length) {
            // 游戏结束,不应该在这里出现
            console.log('the game should have been ended');
            return;
        }

        const startWave = () => {
            this.prev_wave_time = this.scene.time.now; // 更新时间

            // 怪物生成流程
            this.tmpKilled_count = this.killed_count;
            this.killed_count = 0; // 清空当前击杀数字,在生成怪物之间可能会发生击杀怪物事件
            this.spawnMonster();
            this.killed_count += this.tmpKilled_count;
            this.onKilledCountUpdate(this.current_wave_idx - 1); // 之前杀的,更新击杀数

            // 如果当前波为精英或BOSS, 则不启用下一波定时器，
            // 等待精英/BOSS被击杀后由 onKilledCountUpdate 触发下一波或游戏胜利逻辑
            if (this.currentWave().flag === 'elite' || this.currentWave().flag === 'boss') {
                // 设置外部的progress为boss health bar,不影响 this.progress(wave 进度)
                EventBus.emit('boss-health', { health: 100 });
                return;
            }

            // 启动定时器（仅适用于普通波）
            if (this.current_wave_idx >= this.waves.length - 1) return; // 没下一波了
            console.log('next wave timer', this.currentWave().maxDelay * 1000);
            if (this.Timer) {
                this.Timer.reset({
                    delay: this.currentWave().maxDelay * 1000,
                    loop: false,
                    callback: () => {
                        this.nextWave();
                    }
                });
            } else {
                this.Timer = this.scene.time.addEvent({
                    delay: this.currentWave().maxDelay * 1000,
                    loop: false,
                    callback: () => {
                        this.nextWave();
                    }
                });
            }
        };

        // 如果是isFlag,那么输出字幕等待一段时间,否则直接开始
        if (this.currentWave().isFlag) {
            this.scene.broadCastFlag();
            if (this.Timer) {
                this.Timer.reset({
                    delay: 5000,
                    loop: false,
                    callback: () => {
                        startWave();
                    }
                });
            } else {
                this.Timer = this.scene.time.addEvent({
                    delay: 5000,
                    loop: false,
                    callback: () => {
                        startWave();
                    }
                });
            }
        } else {
            startWave();
        }
    }


    shuffleArray<T>(array: T[]): T[] {
        const rng = this.SeedRandom(); // 创建一个基于种子的随机数生成器
        const shuffledArray = [...array]; // 创建原数组的副本

        for (let i = shuffledArray.length - 1; i > 0; i--) {
            const j = Math.floor(rng * (i + 1)); // 使用伪随机数生成器
            [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]]; // 交换元素
        }

        return shuffledArray;
    }

    spawnMonster() {
        const wave = this.currentWave();
        const starNumber = wave.starShards;

        if (wave.duration === 0) {
            return; // 准备波,不生成怪物
        }

        // Acquire current wave's monster number
        const currentMonsters = wave.monsters.reduce((acc, m) => acc + m.count, 0);
        this.total_count += currentMonsters; // 当前波id以及之前的所有(非召唤物)僵尸数量

        let totalMonsters: { mid: number }[] = [];
        const colMax = this.scene.GRID_COLS;
        const rowMax = this.scene.GRID_ROWS - 1;

        // 收集所有怪物
        wave.monsters.forEach(monster => {
            for (let i = 0; i < monster.count; i++) {
                totalMonsters.push({ mid: monster.mid });
            }
        });

        // 1. 确定哪些怪物携带starShards
        totalMonsters = this.shuffleArray(totalMonsters);
        const carryingMonsters = new Set<number>();  // 存储携带starShards的怪物索引
        const maxStars = Math.min(starNumber, totalMonsters.length);  // 确保不超过怪物总数

        // 随机选择starNumber数量的怪物
        while (carryingMonsters.size < maxStars) {
            const randomIdx = Math.floor(this.SeedRandom() * totalMonsters.length);
            carryingMonsters.add(randomIdx);
        }

        const duration = wave.duration * 1000;
        const interval = duration / totalMonsters.length;
        console.log('interval', interval, 'duration', duration);

        // 行权重初始化
        let rowWeights: number[];
        let activeRows: number[] = [];

        if (wave.arrangement === 0x02) {
            const minLines = Math.min(wave.minLine, rowMax + 1);
            const activeRowCount = minLines + Math.floor(this.SeedRandom() * (rowMax + 1 - minLines));
            activeRows = Array.from({ length: rowMax + 1 }, (_, i) => i);
            activeRows = this.shuffleArray(activeRows);
            activeRows = activeRows.slice(0, activeRowCount);
            rowWeights = Array(rowMax + 1).fill(0);
            // 只允许 activeRows 刷怪
            activeRows.forEach(row => rowWeights[row] = 1);
        } else {
            rowWeights = Array(rowMax + 1).fill(1);
        }

        // 新机制：排除指定行 (wave.exceptLine)
        if (wave.exceptLine && wave.exceptLine.length > 0) {
            // 当模式为0x02时，将不允许刷怪的行从 activeRows 中剔除
            if (wave.arrangement === 0x02) {
                activeRows = activeRows.filter(row => !wave.exceptLine.includes(row));
            }
            // 将排除的行的权重设置为0
            wave.exceptLine.forEach(exceptRow => {
                if (exceptRow >= 0 && exceptRow < rowWeights.length) {
                    rowWeights[exceptRow] = 0;
                }
            });
        }

        let monsterIndex = 0;
        if (this.SpawnTimer) this.SpawnTimer.remove();

        this.SpawnTimer = this.scene.time.addEvent({
            delay: interval,
            repeat: totalMonsters.length - 1,
            callback: () => {
                const monsterData = totalMonsters[monsterIndex];
                const row = this.weightedRandomRow(rowWeights, monsterData.mid);
                const newFunc = MonsterFactoryMap[monsterData.mid].NewFunction;
                const zomb = newFunc(this.scene, colMax, row, wave.waveId);

                // 2. 如果当前怪物索引在carryingMonsters中，则设置携带starShards
                if (carryingMonsters.has(monsterIndex) && zomb.couldCarryStarShards) {
                    zomb.carryStar();
                }

                monsterIndex++;

                // 更新行权重
                // 如果选择的行在允许刷怪的 activeRows 中，减少其权重
                if (wave.arrangement === 0x02 && activeRows.includes(row)) {
                    rowWeights[row] = Math.max(0.1, rowWeights[row] - 0.3);
                } else if (wave.arrangement === 0x01) {
                    rowWeights[row] = Math.max(0.1, rowWeights[row] - 0.3);
                }

                this.rebalanceRowWeights(rowWeights, wave.arrangement === 0x02 ? activeRows : null);

                // 确保排除行的权重始终为0（对于默认模式下，可能会在重平衡时恢复）
                if (wave.exceptLine && wave.exceptLine.length > 0) {
                    wave.exceptLine.forEach(exceptRow => {
                        if (exceptRow >= 0 && exceptRow < rowWeights.length) {
                            rowWeights[exceptRow] = 0;
                        }
                    });
                }
            }
        });
    }


    // 权重再平衡函数 (逐渐恢复未选行的权重),支持活跃行
    rebalanceRowWeights(weights: number[], activeRows: number[] | null) {
        const recoveryRate = 0.1;
        if (activeRows) {
            // 只对活跃行恢复权重
            activeRows.forEach(row => {
                weights[row] = Math.min(1, weights[row] + recoveryRate);
            });
        } else {
            // 默认模式，所有行恢复权重
            for (let i = 0; i < weights.length; i++) {
                weights[i] = Math.min(1, weights[i] + recoveryRate);
            }
        }
    }

    // 某一row是否有怪物
    hasMonsterInRow(row: number) {
        const rows = this.monstered.get(`${row}`);
        if (!rows || rows == undefined || rows.length == 0) {
            return false;
        }
        return true;
    }

    // 某一row中,画面的坐标X > 给定x的位置有没有怪物
    hasMonsterInRowAfterX(row: number, x: number, maxDistance: number = 99999) {
        const rows = this.monstered.get(`${row}`);
        if (!rows || rows == undefined || rows.length == 0) {
            return false;
        }
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].getX() > x && rows[i].getX() - x < maxDistance) {
                return true;
            }
        }
        return false;
    }

    // 权重随机选择函数
    weightedRandomRow(weights: number[], mid: number): number {
        const couldSpawnMonster = (row: number, mid: number): boolean => {
            const gridClan = this.scene.gardener.GridClan;
            // Example additional rules
            if ((GroundOnlyZombie.includes(mid))
                && gridClan.RowPropertyRatio(row, 'ground') > 0.6) return false;  // Ground only
            if ((WaterOnlyZombie.includes(mid))
                && gridClan.RowPropertyRatio(row, 'water') > 0.6) return false;   // No water for specific monster
            if ((SkyOnlyZombie.includes(mid))
                && gridClan.RowPropertyRatio(row, 'void') > 0.6) return false;       // No sky for specific monster
            return true;
        };

        // Create a copy of weights to modify
        const weightsCopy = [...weights];

        // Adjust weights based on spawn possibility
        for (let i = 0; i < weightsCopy.length; i++) {
            if (!couldSpawnMonster(i, mid)) {
                weightsCopy[i] = 0;
            }
        }

        const totalWeight = weightsCopy.reduce((acc, w) => acc + w, 0);

        // If all valid weights are zero, fallback to original weights with spawn check
        if (totalWeight === 0) {
            const validRows = weights
                .map((_, index) => index)
                .filter(row => couldSpawnMonster(row, mid));

            if (validRows.length === 0) {
                console.error('No valid rows to spawn monster!');
                // Fallback to fake random row
                return Math.floor(this.SeedRandom() * this.scene.GRID_ROWS);
            }
            return validRows[Math.floor(this.SeedRandom() * validRows.length)];
        }

        let randomNum = this.SeedRandom() * totalWeight;
        for (let i = 0; i < weightsCopy.length; i++) {
            if (randomNum < weightsCopy[i]) {
                return i;
            }
            randomNum -= weightsCopy[i];
        }
        return weightsCopy.length - 1;
    }


    // 怪物生成注册
    registerMonster(monster: IMonster | IObstacle) {
        const key = `${monster.getRow()}`;
        if (!this.monstered.has(key)) {
            this.monstered.set(key, [monster]);
        } else {
            this.monstered.get(key)?.push(monster);
        }
    }

    // 怪物注册销毁
    registerDestroy(monster: IMonster | IObstacle) {
        const key = `${monster.getRow()}`;
        if (this.monstered.has(key)) {
            const list = this.monstered.get(key);
            if (list) {
                const index = list.indexOf(monster);
                if (index >= 0) {
                    list.splice(index, 1);
                }
                if (list.length === 0) {
                    this.monstered.delete(key);
                }
            }
        }
        console.log('monster destroyed', monster.getWaveID());
        if (monster.getWaveID() >= 0) {
            this.killed_count++;
            this.onKilledCountUpdate(monster.getWaveID()); // 非召唤物僵尸(waveId >= 0)杀了才计数
        }
    }

    onKilledCountUpdate(m_waveID: number = -10) {
        if (this.scene.isGameEnd) return; // 结束了,避免结束杀人
        console.log('kill', this.killed_count, '/', this.total_count);
        const waveObj = this.currentWave();

        // 如果是BOSS或精英波
        if (waveObj.flag === 'boss' || waveObj.flag === 'elite') {
            // 当击杀的怪物属于当前精英或BOSS时
            if (m_waveID === waveObj.waveId) {
                EventBus.emit('boss-dead');
                if (waveObj.flag === 'elite') {
                    console.log('精英怪已击杀, 立即开始下一波');
                    this.scene.time.delayedCall(11000, () => {
                        this.nextWave();
                    });
                } else if (waveObj.flag === 'boss') {
                    console.log('BOSS已击杀, 游戏胜利！');
                    this.scene.handleExit(true);
                }
            }
            return;
        }

        // 普通波逻辑：
        // 检查是否所有怪物都被击杀
        if (this.killed_count >= this.total_count) {
            console.log('All monsters in current wave killed!');

            // 如果是最后一波
            if (this.current_wave_idx >= this.wavesLeng - 1) {
                console.log('Last wave detected, starting victory check timer...');
                // 启动一个每1.5秒检查一次的定时器
                const victoryCheckTimer = this.scene.time.addEvent({
                    delay: 1500, // 1.5秒
                    loop: true,
                    callback: () => {
                        if (this.monstered.size === 0) {
                            console.log('No monsters left on the field, game victory!');
                            this.scene.handleExit(true);
                            victoryCheckTimer.remove();
                            victoryCheckTimer.destroy();
                        } else {
                            console.log('Monsters still on field:', this.monstered.size);
                        }
                    }
                });
            } else if (this.current_wave_idx >= 0 && this.current_wave_idx < this.wavesLeng - 1) {
                // 非最后一波，继续下一波逻辑
                // 判断一下minDelay,避免杀的太快
                const now = this.scene.time.now;
                let delay = Math.max(this.currentWave().minDelay * 1000 - (now - this.prev_wave_time), 2000);
                if (delay > 6000) {
                    delay = 6000;
                }
                this.Timer.reset({
                    delay: delay,
                    loop: false,
                    callback: () => {
                        this.nextWave();
                    }
                });
                return;
            } else {
                // 你怎么会在这里?
                console.log('you should not be here');
                this.scene.handleExit(false);
            }
        }
    }


}

// TODO: 光源使用彭装箱,新的lightGroup