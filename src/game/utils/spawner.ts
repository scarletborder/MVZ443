import { Wave } from "../models/IRecord";
import { IZombie } from "../models/IZombie";
import { Game } from "../scenes/Game";
import { MonsterFactoryMap } from "./loader";
import seedrandom from 'seedrandom';
// 出怪实例
// 使用一个刷怪表进行实例化

export default class MonsterSpawner {
    public scene: Game;
    monstered: Map<string, Array<IZombie>> = new Map();
    private SeedRandom: seedrandom.PRNG;

    private waves: Wave[];
    private current_wave_idx: number = 0;

    private SpawnTimer: Phaser.Time.TimerEvent; // 出怪
    private Timer: Phaser.Time.TimerEvent; // 波数
    private prev_wave_time: number = 0;

    private killed_count = 0; // 怪物击杀数
    private total_count = 0; // 怪物总数

    public progress: number = 0; // 进度

    private bossObj: IZombie | null = null; // boss对象,如果有最后一波boss,监听boss存活,
    // BOSS死亡自动emit游戏胜利,不再做胜利判断


    constructor(game: Game, waves_json: any, randomSeed?: number) {
        this.scene = game;
        this.waves = waves_json;
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

    // 整局,触发开始,唯一
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
        // 无论如何都到达了下一波,那么开始进度记录
        if (this.current_wave_idx >= 0) {
            if (this.progress < this.currentWave().progress) { // 新进度
                this.progress = this.currentWave().progress;
                this.scene.broadCastProgress(this.currentWave().progress);
            }
        }

        this.current_wave_idx++;
        console.log('next wave', this.current_wave_idx, this.waves.length);
        if (this.current_wave_idx >= this.waves.length) {
            // 游戏结束,不应该在这里出现
            console.log('the game should have been ended');
            return;
        }

        this.prev_wave_time = this.scene.time.now;
        // total_count 如果没有杀完,加上原来的

        // 怪物生成流程
        this.spawnMonster();
        this.killed_count = 0;

        // 启动定时器
        // 先销毁原来的timer
        if (this.current_wave_idx >= this.waves.length - 1) return; // 没下一波了
        if (this.Timer) {
            this.Timer.reset({
                delay: this.currentWave().minDelay * 1000,
                loop: false,
                callback: () => {
                    this.nextWave();
                }
            });

        } else {
            this.Timer = this.scene.time.addEvent({
                delay: this.currentWave().minDelay * 1000,
                loop: false,
                callback: () => {
                    this.nextWave();
                }
            });
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

        let totalMonsters: { mid: number }[] = [];
        const colMax = this.scene.GRID_COLS;
        const rowMax = this.scene.GRID_ROWS - 1;

        // 收集所有怪物
        wave.monsters.forEach(monster => {
            for (let i = 0; i < monster.count; i++) {
                totalMonsters.push({ mid: monster.mid });
            }
        });

        this.total_count = totalMonsters.length + this.total_count - this.killed_count;
        if (wave.duration === 0) {
            return;
        }

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
            activeRows.forEach(row => rowWeights[row] = 1);
        } else {
            rowWeights = Array(rowMax + 1).fill(1);
        }

        let monsterIndex = 0;
        if (this.SpawnTimer) this.SpawnTimer.remove();

        this.SpawnTimer = this.scene.time.addEvent({
            delay: interval,
            repeat: totalMonsters.length - 1,
            callback: () => {
                const monsterData = totalMonsters[monsterIndex];
                const row = this.weightedRandomRow(rowWeights);
                const newFunc = MonsterFactoryMap[monsterData.mid].NewFunction;
                const zomb = newFunc(this.scene, colMax, row);

                // 2. 如果当前怪物索引在carryingMonsters中，则设置携带starShards
                if (carryingMonsters.has(monsterIndex)) {
                    zomb.carryStar();
                }

                monsterIndex++;

                // 更新行权重
                if (wave.arrangement === 0x02 && activeRows.includes(row)) {
                    rowWeights[row] = Math.max(0.1, rowWeights[row] - 0.3);
                } else if (wave.arrangement === 0x01) {
                    rowWeights[row] = Math.max(0.1, rowWeights[row] - 0.3);
                }
                this.rebalanceRowWeights(rowWeights, wave.arrangement === 0x02 ? activeRows : null);
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
            if (rows[i].x > x && rows[i].x - x < maxDistance) {
                return true;
            }
        }
        return false;
    }

    // 权重随机选择函数
    weightedRandomRow(weights: number[]): number {
        const totalWeight = weights.reduce((acc, w) => acc + w, 0);
        let randomNum = this.SeedRandom() * totalWeight;
        for (let i = 0; i < weights.length; i++) {
            if (randomNum < weights[i]) {
                return i;
            }
            randomNum -= weights[i];
        }
        return weights.length - 1;
    }

    // 怪物生成注册
    registerMonster(monster: IZombie) {
        const key = `${monster.row}`;
        if (!this.monstered.has(key)) {
            this.monstered.set(key, [monster]);
        } else {
            this.monstered.get(key)?.push(monster);
        }
    }

    // 怪物注册销毁
    registerDestroy(monster: IZombie) {
        const key = `${monster.row}`;
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
        this.onMonsterKilled();
    }

    onMonsterKilled() {
        if (this.scene.isGameEnd) return; // 结束了,避免结束杀人
        this.killed_count++;
        console.log('kill', this.killed_count, '/', this.total_count);

        // 检查是否所有怪物都被击杀
        if (this.killed_count >= this.total_count) {
            console.log('All monsters in current wave killed!');

            // 如果是最后一波
            if (this.current_wave_idx === this.waves.length - 1) {
                const waveObj = this.currentWave();
                if (waveObj.flag === 'boss') {
                    console.log('Last wave is boss wave, waiting');
                    return;
                }

                console.log('Last wave detected, starting victory check timer...');

                // 启动一个每1.5秒检查一次的定时器
                const victoryCheckTimer = this.scene.time.addEvent({
                    delay: 1500, // 1.5秒
                    loop: true, // 循环执行
                    callback: () => {
                        // 检查场上是否还有怪物
                        if (this.monstered.size === 0) {
                            console.log('No monsters left on the field, game victory!');
                            this.scene.handleExit(true);
                            victoryCheckTimer.remove(); // 移除定时器
                            victoryCheckTimer.destroy();
                        } else {
                            console.log('Monsters still on field:', this.monstered.size);
                        }
                    }
                });
            } else {
                // 非最后一波，继续下一波逻辑
                const now = this.scene.time.now;
                if (now - this.prev_wave_time > this.currentWave().minDelay * 1000) {
                    this.nextWave();
                } else {
                    this.Timer.reset({
                        delay: this.currentWave().minDelay * 1000 - (now - this.prev_wave_time),
                        loop: false,
                        callback: () => {
                            this.nextWave();
                        }
                    });
                }
            }
        }
    }

}

// TODO: 光源使用彭装箱,新的lightGroup