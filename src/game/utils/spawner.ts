import { LINE_DEPTH } from "../../../public/constants";
import { IZombie } from "../models/IZombie";
import { Game } from "../scenes/Game";
import { MonsterFactoryMap } from "./loader";
// 出怪实例
// 使用一个刷怪表进行实例化

interface StageMap {
    waves: Wave[];
}

interface Wave {
    waveId: number;
    progress: number; // 进度,一般非常小,同时可以被重置,游戏结束不看这个,只是显示用
    flag: string;
    monsters: Monster[];
    duration: number; // seconds
    maxDelay: number; // seconds
    minDelay: number; // seconds
}

interface Monster {
    mid: number;
    count: number;
}

export default class MonsterSpawner {
    public scene: Game;
    monstered: Map<string, Array<IZombie>> = new Map();

    private waves: Wave[];
    private current_wave_idx: number = 0;

    private SpawnTimer: Phaser.Time.TimerEvent; // 出怪
    private Timer: Phaser.Time.TimerEvent; // 波数
    private prev_wave_time: number = 0;

    private killed_count = 0; // 怪物击杀数
    private total_count = 0; // 怪物总数


    constructor(game: Game, waves_json: any) {
        this.scene = game;
        this.waves = waves_json
    }
    // TODO: 追加新的波数, 例如精英关卡开启


    currentWave() {
        return this.waves[this.current_wave_idx];
    }

    // 触发开始,唯一
    startWave() {
        if (this.Timer) {
            this.Timer.remove();
            this.Timer.destroy();
        }
        if (this.SpawnTimer) {
            this.SpawnTimer.remove();
            this.SpawnTimer.destroy();
        }

        this.current_wave_idx = -1;
        this.killed_count = 0;
        this.total_count = 0;
        this.nextWave();
    }

    // Next
    nextWave() {
        // 无论如何都到达了下一波,那么开始进度记录
        if (this.current_wave_idx >= 0) {
            this.scene.broadCastProgress(this.currentWave().progress);
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

    spawnMonster() {
        let wave = this.currentWave();

        const totalMonsters: { mid: number }[] = [];
        // 可生成的范围row = [0, rowMAX], col = colMAX
        const colMax = this.scene.GRID_COLS;
        const rowMax = this.scene.GRID_ROWS - 1;
        wave.monsters.forEach(monster => {
            for (let i = 0; i < monster.count; i++) {
                totalMonsters.push({ mid: monster.mid });
            }
        });

        // 随机打乱怪物顺序
        this.total_count = totalMonsters.length + this.total_count - this.killed_count;
        if (wave.duration === 0) {
            // 无怪物波数
            return;
        }

        Phaser.Utils.Array.Shuffle(totalMonsters);
        const duration = wave.duration * 1000;
        const interval = duration / this.total_count;

        // 行权重初始化
        const rowWeights = Array(rowMax + 1).fill(1);
        let monsterIndex = 0;
        // 定时器逐一生成怪物
        if (this.SpawnTimer) this.SpawnTimer.remove();

        this.SpawnTimer = this.scene.time.addEvent({
            delay: interval,
            repeat: totalMonsters.length - 1,
            callback: () => {
                const monsterData = totalMonsters[monsterIndex++];

                // 根据权重随机选择一行
                const row = this.weightedRandomRow(rowWeights);

                const newFunc = MonsterFactoryMap[monsterData.mid].NewFunction;
                const zomb = newFunc(this.scene, colMax, row);

                // 更新行权重
                rowWeights[row] = Math.max(0.1, rowWeights[row] - 0.3);
                this.rebalanceRowWeights(rowWeights);
            }
        });
    }

    // 某一row是否有怪物
    hasMonsterInRow(row: number) {
        const rows = this.monstered.get(`${row}`);
        if (!rows || rows == undefined || rows.length == 0) {
            return false;
        }
        return true;
    }

    // 某一row > x的位置有没有怪物
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
    }

    // 权重随机选择函数
    weightedRandomRow(weights: number[]): number {
        const totalWeight = weights.reduce((acc, w) => acc + w, 0);
        let randomNum = Math.random() * totalWeight;
        for (let i = 0; i < weights.length; i++) {
            if (randomNum < weights[i]) {
                return i;
            }
            randomNum -= weights[i];
        }
        return weights.length - 1;
    }

    // 权重再平衡函数 (逐渐恢复未选行的权重)
    rebalanceRowWeights(weights: number[]) {
        const recoveryRate = 0.1;
        for (let i = 0; i < weights.length; i++) {
            weights[i] = Math.min(1, weights[i] + recoveryRate);
        }
    }

    onMonsterKilled() {
        this.killed_count++;
        if (this.killed_count >= this.total_count) {
            // TODO:如果是最后一拨,杀完了就没了
            this.scene.broadCastGameOver(true);

            let now = this.scene.time.now;
            // 判断是否mindelay
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

// TODO: 光源使用彭装箱,新的lightGroup