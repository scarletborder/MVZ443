import { Game } from "../scenes/Game";
import { GameParams } from "../models/GameParams";
import { StageData } from "../models/IRecord";
import { PhaserEventBus, PhaserEvents } from "../EventBus";
import { BaseManager } from "./BaseManager";
import { EventBus } from "../../utils/eventBus";
import SyncManager from "./combat/SyncManager";
import TickerManager from "./combat/TickerManager";
import { BaseEntity } from "../models/core/BaseEntity";
import ResourceManager from "./combat/ResourceManager";
import MobManager from "./combat/MobManager";
import AddMapFunction from "../game_events/mapfun";
import { SendEndGame } from "../../utils/net/room";
import { DeferredManager } from "./DeferredManager";

export type CombatStatus = {
  dayOrNight: boolean; // day = true
}

type combatSnapshot = any; // TODO: 定义战斗快照类型

type CombatManagerEventType = {
  onCombatPause: () => void;
  onCombatResume: () => void;
  onCombatEnd: (isWin: boolean) => void;
}

export default class CombatManager extends BaseManager {
  private static _instance: CombatManager;
  protected scene: Game | null = null;

  Eventbus: EventBus<CombatManagerEventType>;

  public params: GameParams | null = null;
  public seed: number = 0;
  public stageData: StageData | null = null;
  public combatStatus: CombatStatus = {
    dayOrNight: true,
  };

  isPaused = true; // 是否暂停
  isGameEnd: boolean = true;

  // 游戏事件
  elapsedFrameTime: number = 0; // 统计时间，用于递增服务器刻

  constructor() {
    super();
    this.Eventbus = new EventBus<CombatManagerEventType>();
  }

  Load(): void {
    // 监听 toggle-pause 事件来切换暂停状态
    PhaserEventBus.on(PhaserEvents.TogglePause, this.handleTogglePause, this);

    PhaserEventBus.on(PhaserEvents.RoomGameStart, this.handleRoomGameStart, this);
    PhaserEventBus.on(PhaserEvents.RoomGameEnd, this.handleRoomGameEnd, this);

    PhaserEventBus.on(PhaserEvents.RoomAllReady,
      (data: { allPlayerCount: number, seed: number, myId: number, playerIds: number }) => {
        this.seed = data.seed;
      }, this);
  }

  public static get Instance(): CombatManager {
    if (!this._instance) {
      this._instance = new CombatManager();
    }
    return this._instance;
  }

  public Reset() {
    this.scene = null;
    this.params = null;
    this.seed = 0;
    this.stageData = null;
    this.isPaused = true;
    this.isGameEnd = true;
    this.combatStatus = {
      dayOrNight: true,
    }
  }

  // 本地主动关闭游戏
  public EndGame(isWin: boolean) {
    SendEndGame(isWin);
    this.handleRoomGameEnd({ isWin });
  }

  private handleTogglePause() {
    if (this.isGameEnd) return; // 游戏结束后不允许切换暂停状态
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.Eventbus.emit('onCombatPause');
    } else if (!this.isPaused) {
      this.Eventbus.emit('onCombatResume');
    }
  }

  // 全部准备好后
  private handleRoomGameStart() {
    const stageData = this.scene?.stageData;
    if (!stageData) {
      console.error("No stage data found for the game start event.");
      return;
    }
    this.isGameEnd = false;

    // 控制MobManager开始工作
    MobManager.Instance.setRandomSeed(this.seed);
    MobManager.Instance.startFirstWave();

    ResourceManager.Instance.SetInitialEnergy(stageData.energy);

    AddMapFunction(this.scene!);
  }

  private handleRoomGameEnd({ isWin }: { isWin: boolean }) {
    this.isGameEnd = true;
    this.isPaused = true;
    this.Eventbus.emit('onCombatEnd', isWin);
  }

  public update(time: number, delta: number) {
    // TODO: 如果倍速，那么这里delta还要乘以倍速系数,以让物理世界和scene视觉同步倍速
    // 自增属性
    this.elapsedFrameTime += delta;

    // 物理帧更新
    while (this.elapsedFrameTime >= SyncManager.Instance.FrameInterval) {
      this.elapsedFrameTime -= SyncManager.Instance.FrameInterval;
      // 更新tick-时间相关
      if (!this.isPaused) {
        TickerManager.Instance.Update();
      }

      // 更新物理-时间相关
      if (!this.isPaused) {
        this.scene?.rapierWorld?.step(this.scene.rapierEventQueue);
        // 处理相交事件
        this.scene?.rapierEventQueue.drainCollisionEvents((handle1: number, handle2: number, started: boolean) => {
          // started 为 true 表示两个物体开始接触 (Enter)
          // started 为 false 表示两个物体分开了 (Leave)
          if (started) {
            this.scene?.handleCollision(handle1, handle2);
          }
        });

        // 更新每一个物理体的view
        this.scene?.rapierWorld?.bodies.forEach(rigidBody => {
          const position = rigidBody.translation();
          const gameObject = rigidBody.userData;
          if (gameObject instanceof BaseEntity) {
            gameObject.stepUpdate();
            gameObject.updateView(position);
          }
        });
      }

      // 消费服务器帧-时间无关
      SyncManager.Instance.update();

      // Post-update -时间无关
      DeferredManager.Instance.flush();

      // 存储状态-仅在非暂停时存储
      // TODO: 存储当前状态到帧id对应的快照 
    }

    // 常规
    SyncManager.Instance.sendQueue.Consume();
  }



}