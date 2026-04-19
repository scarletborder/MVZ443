
import seedrandom from "seedrandom";
import { Wave } from "../../models/IRecord";
import GridManager from "./GridManager";
import { PositionManager } from "../view/PositionManager";
import { CombatEntity } from "../../models/core/CombatEntity";
import {
  PhaserEventBus,
  PhaserEvents,
} from "../../EventBus";
import { GroundOnlyZombie, SkyOnlyZombie, WaterOnlyZombie } from "../../utils/helper/PlantHelper";
import { BaseManager } from "../BaseManager";
import type { Game } from "../../scenes/Game";
import TickerManager, { FrameTimer } from "./TickerManager";
import { EventBus } from "../../../utils/eventBus";
import CombatManager from "../CombatManager";
import { MonsterLibrary } from "../library/MonsterLibrary";
import { DeferredManager } from "../DeferredManager";
import { MonsterEntity } from "../../models/entities/MonsterEntity";

type Mob = CombatEntity;

export enum ProgressMode {
  Normal = "NORMAL",
  Boss = "BOSS"
}

// 普通模式的详细数据
interface NormalProgressData {
  mode: ProgressMode.Normal;
  totalWaves: number;      // 总波数
  currentWave: number;     // 当前已过波数
  flagWaves: number[];     // 旗帜所在的波数节点，如 [10, 20, 30]
}

// Boss模式的详细数据
interface BossProgressData {
  mode: ProgressMode.Boss;
  bossHealthPercent: number; // 0.0 - 1.0
}

// 使用联合类型，确保事件参数的严谨性
export type ProgressUpdateEvent = NormalProgressData | BossProgressData;

type MobManagerEvent = {
  // 新的一波开始
  onNewWave: (waveId: number, isFlag: boolean) => void;
  // 通知下一波是flag波,例如通知输出字幕等待一段时间
  onNotifyFlagWave: (waveId: number) => void;

  // progress
  onProgressUpdate: (progress: ProgressUpdateEvent) => void;

  // 最后一波，小怪全部阵亡/首要boss阵亡
  onAllWavesCompleted: () => void;
}

export default class MobManager extends BaseManager {
  private static _instance: MobManager;
  protected scene: Game | null = null;

  public EventBus: EventBus<MobManagerEvent>;
  private seed: number = 0;

  // 存活的怪物列表
  public MobsByLane: Map<number, Mob[]> = new Map(); // 按行分的怪物列表
  private _seedRandom: seedrandom.PRNG;

  private waves: Wave[];
  private current_wave_idx: number = 0;

  private SpawnTimer: FrameTimer; // 出怪
  private Timer: FrameTimer | null = null; // 波数使用帧驱动定时器，类型为 FrameTimer
  private prev_wave_frame: number = 0;

  private tmpKilled_count = 0;// 两波之间存击杀数
  private killed_count = 0; // 怪物击杀数
  private total_count = 0; // 怪物总数

  // 进度, 由wave定，
  // FUTURE： 如果存在多boss，或占比不同，还要再微调
  public progress: number = 0;

  private bossObj: CombatEntity | null = null; // boss对象,如果有最后一波boss,监听boss存活,
  // BOSS死亡自动emit游戏胜利,不再做胜利判断

  constructor() {
    super();
    this.EventBus = new EventBus<MobManagerEvent>();
    // Initialize MobManager
  }
  public Load(): void {
    PhaserEventBus.on(PhaserEvents.RoomAllReady,
      (data: { allPlayerCount: number, seed: number, myId: number, playerIds: number }) => {
        this.seed = data.seed;
      }, this);
    PhaserEventBus.on(PhaserEvents.RoomGameStart, this.handleRoomGameStart, this);
  }

  public setScene(scene: Game) {
    this.scene = scene;
  }

  public setWaves(waves: Wave[]) {
    this.waves = waves;
  }


  public get wavesLeng(): number {
    return this.waves ? this.waves.length : 0;
  }

  public static get Instance(): MobManager {
    if (!this._instance) {
      this._instance = new MobManager();
    }
    return this._instance;
  }

  public Reset() {
    this.scene = null;
  }

  public get SeedRandom(): seedrandom.PRNG {
    return this._seedRandom;
  }

  currentWave() {
    return this.waves[this.current_wave_idx];
  }

  setRandomSeed(seed: number) {
    this._seedRandom = seedrandom.alea(String(seed))
  }

  // 整局,触发开始,一局游戏只能调用一次
  startFirstWave() {
    // 如果存在之前的帧定时器，取消之
    if (this.Timer) {
      this.Timer.remove(); // 取消之前的定时器
    }
    // 同时取消出怪定时器
    if (this.SpawnTimer) {
      this.SpawnTimer.remove();
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
      this.progress = this.currentWave().progress; // 上一波的进度到达完成!
    }

    this.current_wave_idx++;
    this.EventBus.emit('onProgressUpdate', {
      mode: ProgressMode.Normal,
      totalWaves: this.wavesLeng,
      currentWave: this.current_wave_idx, // 已过波数
      flagWaves: this.waves.filter(w => w.isFlag).map(w => w.waveId), // 旗帜所在的波数节点，如 [10, 20, 30]
    } as NormalProgressData);

    console.log('next wave', this.current_wave_idx, '/', this.wavesLeng);
    if (this.current_wave_idx >= this.waves.length) {
      // 游戏结束,不应该在这里出现
      console.log('the game should have been ended');
      return;
    }

    const startNewWave = () => {
      this.prev_wave_frame = TickerManager.Instance.getCurrentFrame(); // 更新时间

      // 发出新波开始事件
      const waveObj = this.currentWave();
      this.EventBus.emit('onNewWave', waveObj.waveId, waveObj.isFlag);

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
        PhaserEventBus.emit(PhaserEvents.BossHealth, { health: 100 });
        return;
      }

      // 启动定时器（仅适用于普通波）
      if (this.current_wave_idx >= this.waves.length - 1) return; // 没下一波了

      console.log('next wave timer', this.currentWave().maxDelay * 1000);
      if (this.Timer) {
        this.Timer.remove(); // 取消之前的定时器
      }

      // 使用帧驱动定时器延迟调用 nextWave
      this.Timer = TickerManager.Instance.delayedCall({
        callback: () => {
          this.nextWave();
        },
        delay: this.currentWave().maxDelay * 1000,
      }); // 延迟时间
    };

    // 如果是isFlag,那么输出字幕等待一段时间,否则直接开始
    if (this.currentWave().isFlag) {
      this.EventBus.emit('onNotifyFlagWave', this.currentWave().waveId);
      if (this.Timer) {
        this.Timer.remove(); // 取消之前的定时器
      }

      this.Timer = TickerManager.Instance.delayedCall({
        callback: () => {
          startNewWave();
        },
        delay: 5000,
      });
    } else {
      startNewWave();
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
    if (this.scene == null) {
      console.error('Scene is not set in MobManager');
      return;
    }
    const wave = this.currentWave();
    const starNumber = wave.starShards;

    if (wave.duration === 0) {
      return; // 准备波,不生成怪物
    }

    // Acquire current wave's monster number
    const currentMonsters = wave.monsters.reduce((acc, m) => acc + m.count, 0);
    this.total_count += currentMonsters; // 当前波id以及之前的所有(非召唤物)僵尸数量

    let totalMonsters: { mid: number }[] = [];
    const colMax = PositionManager.Instance.Col_Number; // 出生在可种植植物列的右边
    const rowMax = PositionManager.Instance.Row_Number - 1;

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

    this.SpawnTimer = TickerManager.Instance.addEvent({
      delay: interval,
      repeat: totalMonsters.length - 1,
      callback: () => {
        if (this.scene == null) return;
        const monsterData = totalMonsters[monsterIndex];
        const row = this.weightedRandomRow(rowWeights, monsterData.mid);

        // 换成新版本的新建怪物函数
        const model = MonsterLibrary.GetModel(monsterData.mid);
        if (!model) {
          console.error(`Monster model with mid ${monsterData.mid} not found!`);
          return;
        }

        DeferredManager.Instance.defer(() => {
          if (!this.scene) return;
          const zomb = model.createEntity(this.scene, colMax, row, wave.waveId);
          this.attachLifecycle(zomb);

          // 2. 如果当前怪物索引在carryingMonsters中，则设置携带starShards
          if (zomb && carryingMonsters.has(monsterIndex) && model.couldCarryStarShards) {
            zomb.carryStarShards = true;
          }
        });

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


  // 权重随机选择函数
  weightedRandomRow(weights: number[], mid: number): number {
    const couldSpawnMonster = (row: number, mid: number): boolean => {
      const gridClan = GridManager.Instance;;
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
        return Math.floor(this.SeedRandom() * PositionManager.Instance.Row_Number);
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
  registerMonster(monster: CombatEntity) {
    const key = monster.GetRow();
    if (!this.MobsByLane.has(key)) {
      this.MobsByLane.set(key, [monster]);
    } else {
      this.MobsByLane.get(key)?.push(monster);
    }
  }

  // 怪物注册销毁
  registerDestroy(monster: CombatEntity) {
    const key = monster.GetRow();
    const mobsInLane = this.MobsByLane.get(key);
    if (mobsInLane) {
      const index = mobsInLane.indexOf(monster);
      if (index >= 0) {
        mobsInLane.splice(index, 1);
        if (mobsInLane.length === 0) {
          this.MobsByLane.delete(key);
        }
      }
    }
    const waveId = monster.GetExtraData<number>('waveId') ?? -1;
    console.log('monster destroyed', waveId);
    if (waveId >= 0) {
      this.killed_count++;
      this.onKilledCountUpdate(waveId); // 非召唤物僵尸(waveId >= 0)杀了才计数
    }
  }

  private attachLifecycle(monster: MonsterEntity) {
    this.registerMonster(monster);
    monster.addDestroyListener((entity) => this.registerDestroy(entity));
  }

  onKilledCountUpdate(m_waveID: number = -10) {
    if (CombatManager.Instance.isGameEnd) return; // 结束了,避免结束杀人
    console.log('kill', this.killed_count, '/', this.total_count);
    const waveObj = this.currentWave();

    // 如果是BOSS或精英波
    if (waveObj.flag === 'boss' || waveObj.flag === 'elite') {
      // 当击杀的怪物属于当前精英或BOSS时
      if (m_waveID === waveObj.waveId) {
        PhaserEventBus.emit(PhaserEvents.BossDead);
        if (waveObj.flag === 'elite') {
          console.log('精英怪已击杀, 立即开始下一波');
          TickerManager.Instance.delayedCall({
            callback: () => {
              this.nextWave();
            },
            delay: 11000
          });
        } else if (waveObj.flag === 'boss') {
          console.log('BOSS已击杀, 游戏胜利！');
          this.EventBus.emit('onAllWavesCompleted');
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
        const victoryCheckTimer = TickerManager.Instance.addEvent({
          delay: 1500, // 1.5秒
          loop: true,
          callback: () => {
            if (this.MobsByLane.size === 0) {
              console.log('No monsters left on the field, game victory!');
              this.EventBus.emit('onAllWavesCompleted');
              victoryCheckTimer.remove();
            } else {
              console.log('Monsters still on field:', this.MobsByLane.size);
            }
          }
        });
      } else if (this.current_wave_idx >= 0 && this.current_wave_idx < this.wavesLeng - 1) {
        // 非最后一波，继续下一波逻辑
        // 判断一下minDelay,避免杀的太快
        const now_frame = TickerManager.Instance.getCurrentFrame();
        const interval = TickerManager.Instance.calcTickDeltaMs(this.prev_wave_frame, now_frame);
        let delay = Math.max(this.currentWave().minDelay * 1000 - interval, 2000);
        if (delay > 6000) {
          delay = 6000;
        }

        if (this.Timer) {
          this.Timer.remove(); // 取消之前的定时器
        }
        this.Timer = TickerManager.Instance.delayedCall({
          callback: () => {
            this.nextWave();
          },
          delay: delay,
        });
        return;
      } else {
        // 你怎么会在这里?
        console.log('Fatal Error: you should not be here');
        // TODO : fatal error exit
      }
    }
  }

  private handleRoomGameStart() {
    this.setRandomSeed(this.seed);
    this.startFirstWave();
  }
}
