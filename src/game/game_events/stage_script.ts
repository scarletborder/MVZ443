import seedrandom from "seedrandom";
import { Monster, Wave } from "../models/IRecord";
import { MonsterFactoryMap } from "../presets";

// 外部传入的关卡脚本类
export class StageScript {

    /**
     * 第一波的波数索引(不影响结果waveId), 影响后续难度
     */
    first_wave_id: number = 0;

    /**
     * 不考虑boss情况下,实际生成的总波数数量,即wave[].length
     */
    total_waves: number = 40;

    /**
     * 最终波数达到的难度上限
     * 
     * 请参考 `tools/spawner/difficulty.csv`
     * 
     * 一般来说,40波难度上限为40
     */
    difficulty_limit: number = 40;

    /**
     * 早期阶段结束的波数索引（波 0 到 phase1_end - 1）
     */
    phase1_end: number = 12;

    /**
     * 中期阶段结束的波数索引（波 phase1_end 到 phase2_end - 1）
     */
    phase2_end: number = 30;

    /**
     * 1: 白天, 2: 晚上
     */
    dayOrNight: number = 2;

    /**
     * 定义 flag wave，提前准备时间较充足
     */
    flagWaves: number[] = [10, 25, 35];

    /**
     * 水之道，前几波不刷怪的路
     */
    waterWays: number[] = [1, 2, 3];

    /**
     * 允许刷怪的怪物ID
     */
    AllowedMobs: number[] = [1, 2, 3, 4, 8, 7, 5, 9, 11];

    /**
     * 全局倍率
     */
    globalRatio: [number, number][] = [[0, 1.0], [30, 1.3]];

    /**
     * 按照first_wave_id影响之后的重新编排波数序号之后插入boss的 序号和 boss mid
     * 
     * 该数组的长度 > 1时,最后一个为Boss,之前的为elite
     * 
     * 但注意,boss波结束后,游戏直接结束; elite结束,游戏继续
     * 
     * 例如first_wave_id = 4, total_waves = 30, 则bossInsert = [[12, 30]]
     * 依然会在第30波(从0开始)进行插入,而不是第25波之后
     */
    bossInsert: [number, number][] = [[12, 15]];
}

// 生成 elite wave
function generateEliteWave(mid: number): Wave {
    return {
        waveId: 0,         // 待重新赋值
        progress: 0,       // 待重新计算
        flag: "elite",
        monsters: [{
            mid: mid,
            count: 1
        }],
        duration: 5,
        maxDelay: 60, // elite/boss波不定时,这里只作占位
        minDelay: 60,
        arrangement: 0x01,
        minLine: 1,
        exceptLine: [],
        starShards: 0,
        isFlag: false
    }
}

// 生成 boss wave
function generateBossWave(mid: number): Wave {
    return {
        waveId: 0,         // 待重新赋值
        progress: 0,       // 待重新计算
        flag: "boss",
        monsters: [{
            mid: mid,
            count: 1
        }],
        duration: 5,
        maxDelay: 60,
        minDelay: 60,
        arrangement: 0x01,
        minLine: 1,
        exceptLine: [],
        starShards: 0,
        isFlag: false
    }
}

// 插入元素的辅助函数：用于 Wave[] 的插入
function insertWaves(arr: Wave[], insertions: [number, Wave][]): Wave[] {
    const insertionMap = new Map<number, Wave[]>();
    for (const [index, wave] of insertions) {
        if (!insertionMap.has(index)) {
            insertionMap.set(index, []);
        }
        insertionMap.get(index)!.push(wave);
    }
    const result: Wave[] = [];
    for (let i = 0; i < arr.length; i++) {
        result.push(arr[i]);
        if (insertionMap.has(i)) {
            result.push(...insertionMap.get(i)!);
        }
    }
    return result;
}

// 调试关卡,在第一波内出完所有的AllowedMobs
function debugScript(stage: StageScript): Wave[] {
    const monsters: Monster[] = Object.values(stage.AllowedMobs).map((mid) => {
        return {
            mid: mid,
            count: 1
        }
    });
    return [{
        waveId: 0,
        progress: 0,
        flag: "normal",
        isFlag: false,
        monsters: monsters,
        duration: 2,
        maxDelay: 20,
        minDelay: 20,
        arrangement: 0x01,
        minLine: 1,
        exceptLine: [],
        starShards: 0
    }]
}

// 主函数：根据 StageScript 生成 Wave[]
export function generateStageScript(stage: StageScript, random: seedrandom.PRNG): Wave[] {
    // 调试入口, totalwaves = 114514
    if (stage.total_waves === 114514) {
        // 
        return debugScript(stage);
    }


    // ---------------- 全局参数 ----------------
    const first_wave_id = stage.first_wave_id;
    const total_waves = stage.total_waves;
    const difficulty_limit = stage.difficulty_limit;
    const phase1_end = stage.phase1_end;
    const phase2_end = stage.phase2_end;
    const dayOrNight = stage.dayOrNight;
    const flagWaves = stage.flagWaves;
    const waterWays = stage.waterWays;
    const AllowedMobs = new Set(stage.AllowedMobs);
    const globalRatio = stage.globalRatio;

    // ---------------- 内部计算变量 ----------------
    const _total_waves = total_waves + first_wave_id;
    const _phase1_end = phase1_end + first_wave_id;
    const _phase2_end = phase2_end + first_wave_id;
    // 调整 flagWaves 波数
    const _flagWaves: number[] = flagWaves.map(w => w + first_wave_id);


    // ---------------- 辅助函数 ----------------
    // 返回[min, max]之间的随机整数（包含两端）
    function randomInt(min: number, max: number): number {
        return Math.floor(random() * (max - min + 1)) + min;
    }

    // 加权随机选择
    function weightedRandomChoice(options: number[], weights: number[]): number {
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let rnd = random() * totalWeight;
        for (let i = 0; i < options.length; i++) {
            rnd -= weights[i];
            if (rnd < 0) {
                return options[i];
            }
        }
        return options[options.length - 1];
    }

    // ---------------- 怪物生成逻辑 ----------------
    function GetMobWeight(mobId: number, waveId: number): number {
        return MonsterFactoryMap[mobId].weight(waveId);
    }

    // 某一波中是否可以出现
    function CanMobAppear(mobId: number, waveId: number): boolean {
        if (!AllowedMobs.has(mobId)) {
            return false;
        }

        if (MonsterFactoryMap[mobId].leastWaveID > waveId) return false;
        return true;
    }

    function generateMobs(levelSum: number, waveId: number): { [mobId: number]: number } {
        const mobList: { [mobId: number]: number } = {};
        const mobKeys = [];

        for (const mrecord of Object.values(MonsterFactoryMap)) {
            const mobId = mrecord.mid;
            if (mrecord.weight(waveId) === 0) continue;
            mobKeys.push(mobId);
        }

        const weights = mobKeys.map(mobId => GetMobWeight(mobId, waveId));

        let remainingLevel = levelSum;
        while (remainingLevel > 1) {
            const mobId = weightedRandomChoice(mobKeys, weights);
            const mobLevel = MonsterFactoryMap[mobId].level;
            if (CanMobAppear(mobId, waveId) && mobLevel <= remainingLevel) {
                mobList[mobId] = (mobList[mobId] || 0) + 1;
                remainingLevel -= mobLevel;
            }
        }
        // 若剩余 level 为 1，则补充一个普通僵尸
        if (remainingLevel === 1) {
            mobList[1] = (mobList[1] || 0) + 1;
        }
        return mobList;
    }

    // ---------------- 难度曲线相关 ----------------
    // 固定设计比例
    const early_ratio = 0.2; // 早期阶段结束时难度比例
    const mid_ratio = 0.8;   // 中期阶段结束时难度比例
    const k = 0.1;         // 中期阶段增长常数

    // 早期阶段: 二次函数
    const a = (early_ratio * difficulty_limit) / (_phase1_end ** 2);
    function difficulty_early(wave_idx: number): number {
        return a * (wave_idx ** 2);
    }

    // 中期阶段: 指数函数
    const D0 = difficulty_early(_phase1_end);
    const c = ((mid_ratio * difficulty_limit) - D0) / (Math.exp(k * (_phase2_end - _phase1_end)) - 1);
    function difficulty_mid(wave_idx: number): number {
        return D0 + c * (Math.exp(k * (wave_idx - _phase1_end)) - 1);
    }

    // 后期阶段: Logistic 曲线
    const A = _phase2_end;
    const B = _total_waves - 1;
    const x_mid = (A + B) / 2;
    const r = (2 / (B - A)) * Math.log(1 / mid_ratio);
    const L = difficulty_limit * (mid_ratio + 1);
    function difficulty_late(wave_idx: number): number {
        return L / (1 + Math.exp(-r * (wave_idx - x_mid)));
    }

    // 根据全局倍率获取倍率值（globalRatio 数组假定按阈值递增排序）
    function get_wave_ratio(waveID: number): number {
        let ratio = globalRatio[0][1];
        for (let i = 0; i < globalRatio.length; i++) {
            if (waveID >= globalRatio[i][0]) {
                ratio = globalRatio[i][1];
            } else {
                break;
            }
        }
        return ratio;
    }

    function difficulty(wave_idx: number): number {
        if (wave_idx < _phase1_end) {
            return difficulty_early(wave_idx) * get_wave_ratio(wave_idx);
        } else if (wave_idx < _phase2_end) {
            return difficulty_mid(wave_idx) * get_wave_ratio(wave_idx);
        } else {
            return difficulty_late(wave_idx) * get_wave_ratio(wave_idx);
        }
    }

    // ---------------- 生成关卡辅助函数 ----------------
    function getLevelSum(waveId: number): number {
        // flag 波倍率为 2.5，否则为 1
        const ratio = _flagWaves.includes(waveId) ? 2.5 : 1;
        return Math.ceil(difficulty(waveId) * ratio);
    }

    function getAllTimes(waveId: number): { duration: number; minDelay: number; maxDelay: number } {
        const duration = 5; // 固定时长，单位秒

        const maxDelay = (_flagWaves.includes(waveId) ? 40 : 22) + randomInt(0, 5); // 本波为flag
        let minDelay: number;
        if (waveId === 1) {
            minDelay = 14;
        } else if (waveId === 2) {
            minDelay = 12;
        } else if (_flagWaves.includes(waveId + 1)) { // 下一波为flag
            minDelay = maxDelay - 1;
        } else {
            minDelay = 6;
        }
        return { duration, minDelay, maxDelay };
    }

    // 生成单个 Wave 对象
    function oneObject(waveId: number): Wave {
        if (waveId === 0) {
            return {
                waveId: 0,
                progress: 0,
                flag: "normal",
                monsters: [],
                duration: 0,
                maxDelay: dayOrNight === 1 ? 20 : 26,
                minDelay: 18,
                arrangement: 0x01,
                minLine: 1,
                exceptLine: [],
                starShards: 0,
                isFlag: false
            };
        }

        const progress = Math.ceil((waveId / _total_waves) * 100);
        // 默认 arrangement 为 0x01 (均匀)
        let arrangement: 0x01 | 0x02 = 0x01;
        let minLine = 1;
        // 30% 概率调整为 0x02 (集中) 并随机指定 minLine
        if (random() < 0.3) {
            arrangement = 0x02;
            minLine = randomInt(2, 3);
        }

        // 星屑：每 5 波额外增加 1
        let starShards = waveId % 5 === 0 ? 1 : 0;
        // 每15波额外增加1
        if (waveId % 15 === 0) starShards += 1;

        const levelSum = getLevelSum(waveId);
        const { duration, minDelay, maxDelay } = getAllTimes(waveId);

        // 早期阶段不刷水道；若 waterWays 存在则设置 exceptLine，否则为空数组
        const exceptLine = waveId <= 3 && waterWays.length > 0 ? waterWays : [];

        // 生成怪物列表
        const mobDict = generateMobs(levelSum, waveId);
        const monsters: Monster[] = [];
        for (const mobIdStr in mobDict) {
            const mobId = parseInt(mobIdStr);
            monsters.push({
                mid: mobId,
                count: mobDict[mobId]
            });
        }

        return {
            waveId,
            progress,
            flag: "normal",
            monsters,
            duration,
            maxDelay,
            minDelay,
            arrangement,
            minLine,
            exceptLine,
            starShards,
            isFlag: _flagWaves.includes(waveId)
        };
    }

    // 预计算每波难度，用于后续计算 levelSum 等
    const difficulties: number[] = [];
    for (let w = 0; w < _total_waves; w++) {
        difficulties.push(difficulty(w));
    }

    // 生成所有 Wave 对象，并只返回从 first_wave_id 开始的部分
    let ret: Wave[] = [];
    for (let waveId = 0; waveId < _total_waves; waveId++) {
        ret.push(oneObject(waveId));
    }
    ret = ret.slice(first_wave_id);

    // 重新编号wave id
    for (let i = 0; i < ret.length; i++) {
        ret[i].waveId = i;
    }

    // 插入 elite 和 boss wave
    if (stage.bossInsert.length > 0) {
        // bossInsert 中的所有条目，除最后一条为 boss，其余为 elite
        const insertOps: [number, Wave][] = [];
        for (let i = 0; i < stage.bossInsert.length; i++) {
            const [insertIndex, mobMid] = stage.bossInsert[i];
            if (i < stage.bossInsert.length - 1) {
                // elite
                insertOps.push([insertIndex, generateEliteWave(mobMid)]);
            } else {
                // 最后一条 boss
                insertOps.push([insertIndex, generateBossWave(mobMid)]);
            }
        }
        ret = insertWaves(ret, insertOps);
    }

    // 插入完成后重新计算 progress 和重新编号 waveId
    const total = ret.length;
    for (let i = 0; i < total; i++) {
        ret[i].waveId = i;
        // 重新计算 progress, 最后一波为 100%
        ret[i].progress = Math.ceil((i / (total - 1)) * 100);
    }
    ret[0].monsters = []; // 第一波不刷怪
    ret[0].maxDelay = dayOrNight === 1 ? 20 : 26;
    return ret;
}

/**
 *  给任何boss用的刷boss召唤的小弟怪物的函数函数
 * @param baseLevelSum boss指定的基础难度sum
 * @param seedrandom 伪随机生成机
 * @param callIdx 这是第几次召唤怪物,难度会是low,medium,high轮流
 */
export function generateBossWaveScript(baseLevelSum: number, seedrandom: seedrandom.PRNG, AllowedMobs: number[], callIdx: number = 0): Monster[] {
    const levelRatio = [0.5, 1.0, 1.5][callIdx % 3];
    const levelSum = Math.ceil(baseLevelSum * levelRatio);
    const WAVE_ID = 9999; // 使用一个较大的数值确保所有怪物都可以出现

    // 收集允许的怪物及其权重
    const mobKeys: number[] = [];
    const weights: number[] = [];

    for (const mobId of AllowedMobs) {
        if (MonsterFactoryMap[mobId]) {
            mobKeys.push(mobId);
            weights.push(MonsterFactoryMap[mobId].weight(WAVE_ID));
        }
    }

    // 生成怪物列表
    const monsters: Monster[] = [];
    let remainingLevel = levelSum;

    // 加权随机选择函数
    function weightedRandomChoice(options: number[], weights: number[]): number {
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let rnd = seedrandom() * totalWeight;
        for (let i = 0; i < options.length; i++) {
            rnd -= weights[i];
            if (rnd < 0) {
                return options[i];
            }
        }
        return options[options.length - 1];
    }

    // 按照难度总和生成怪物
    const mobCounts: { [key: number]: number } = {};
    while (remainingLevel > 1) {
        const mobId = weightedRandomChoice(mobKeys, weights);
        const mobLevel = MonsterFactoryMap[mobId].level;

        if (mobLevel <= remainingLevel) {
            mobCounts[mobId] = (mobCounts[mobId] || 0) + 1;
            remainingLevel -= mobLevel;
        }
    }

    // 如果还剩1点难度，补充一个普通僵尸
    if (remainingLevel === 1 && AllowedMobs.includes(1)) {
        mobCounts[1] = (mobCounts[1] || 0) + 1;
    }

    // 转换为Monster数组格式
    for (const [mobId, count] of Object.entries(mobCounts)) {
        monsters.push({
            mid: parseInt(mobId),
            count: count
        });
    }

    return monsters;
}