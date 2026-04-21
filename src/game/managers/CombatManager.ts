import { Game } from "../scenes/Game";
import { GameParams } from "../models/GameParams";
import { StageData } from "../models/IRecord";
import { PhaserEventBus, PhaserEvents } from "../EventBus";
import { BaseManager } from "./BaseManager";
import { EventBus } from "../../utils/eventBus";
import SyncManager from "./combat/SyncManager";
import TickerManager from "./combat/TickerManager";
import { BaseEntity } from "../models/core/BaseEntity";
import { SendEndGame } from "../../utils/net/room";
import { DeferredManager } from "./DeferredManager";
import { onlineStateManager } from "../../store/OnlineStateManager";
import { RoomAllReadyEvent } from "../../types/online";
import BackendWS, { HasConnected } from "../../utils/net/sync";
import CardpileManager from "./combat/CardpileManager";

export type CombatStatus = {
  dayOrNight: boolean; // day = true
}

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

  private _isPaused = true; // Whether combat is paused.
  isGameEnd: boolean = true;
  private readonly handleRoomAllReady = (data: RoomAllReadyEvent) => {
    this.seed = data.seed;
  };

  // Accumulated frame time for fixed-step simulation.
  elapsedFrameTime: number = 0;

  constructor() {
    super();
    this.Eventbus = new EventBus<CombatManagerEventType>();
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  public set isPaused(value: boolean) {
    if (this._isPaused === value) {
      return;
    }
    this._isPaused = value;
    if (value) {
      this.Eventbus.emit("onCombatPause");
    } else {
      this.Eventbus.emit("onCombatResume");
    }
  }

  Load(): void {
    // Listen for pause toggles.
    PhaserEventBus.on(PhaserEvents.TogglePause, this.handleTogglePause, this);
    PhaserEventBus.on(PhaserEvents.TimespeedToggle, this.handleTimespeedToggle, this);

    PhaserEventBus.on(PhaserEvents.RoomGameStart, this.handleRoomGameStart, this);
    PhaserEventBus.on(PhaserEvents.RoomGameEnd, this.handleRoomGameEnd, this);

    PhaserEventBus.on(PhaserEvents.RoomAllReady, this.handleRoomAllReady, this);
    const roomAllReady = onlineStateManager.getRoomAllReady();
    if (roomAllReady) {
      this.handleRoomAllReady(roomAllReady);
    }
  }

  public static get Instance(): CombatManager {
    if (!this._instance) {
      this._instance = new CombatManager();
    }
    return this._instance;
  }

  public Reset() {
    PhaserEventBus.off(PhaserEvents.TogglePause, this.handleTogglePause, this);
    PhaserEventBus.off(PhaserEvents.TimespeedToggle, this.handleTimespeedToggle, this);
    PhaserEventBus.off(PhaserEvents.RoomGameStart, this.handleRoomGameStart, this);
    PhaserEventBus.off(PhaserEvents.RoomGameEnd, this.handleRoomGameEnd, this);
    PhaserEventBus.off(PhaserEvents.RoomAllReady, this.handleRoomAllReady, this);

    if (this.scene) {
      this.scene.time.timeScale = 1;
    }
    this.scene = null;
    this.params = null;
    this.seed = 0;
    this.stageData = null;
    this.elapsedFrameTime = 0;
    this.isPaused = true;
    this.isGameEnd = true;
    this.Eventbus.removeAllListeners();
    this.combatStatus = {
      dayOrNight: true,
    };
  }

  // Local active game over.
  public EndGame(isWin: boolean) {
    SendEndGame(isWin);
    this.handleRoomGameEnd({ isWin });
  }

  private handleTogglePause() {
    if (BackendWS.isOnlineMode()) return;
    if (this.isGameEnd) return;
    this._isPaused = !this._isPaused;
    if (this._isPaused) {
      this.elapsedFrameTime = 0;
    }
    if (this._isPaused) {
      this.Eventbus.emit("onCombatPause");
    } else if (!this._isPaused) {
      this.Eventbus.emit("onCombatResume");
    }
  }

  // All players are ready.
  private handleRoomGameStart() {
    const stageData = this.scene?.stageData;
    if (!stageData) {
      console.error("No stage data found for the game start event.");
      return;
    }
    if (this.scene) {
      this.scene.time.timeScale = 1;
    }
    this.elapsedFrameTime = 0;
    this.isGameEnd = false;
    this.isPaused = false;
  }

  private handleRoomGameEnd({ isWin }: { isWin: boolean }) {
    this.isGameEnd = true;
    this.isPaused = true;
    this.Eventbus.emit("onCombatEnd", isWin);
  }

  // 切换游戏速度（1速/2速）
  public handleTimespeedToggle(): boolean {
    // 多人游戏无效 / 暂停时无效 / 结束时无效
    if (HasConnected() || this.isPaused || this.isGameEnd) return false;
    if (!this.scene) return false;

    const previousTimeScale = this.scene.time.timeScale;
    const nextTimeScale = previousTimeScale > 1 ? 1 : 2; // 只在 1 速 / 2 速间切换
    const didToggle = previousTimeScale !== nextTimeScale;
    if (!didToggle) return false;

    // 修改 GameScene 时钟快慢，驱动 update 里的 elapsedFrameTime 增长速度
    this.scene.time.timeScale = nextTimeScale;
    PhaserEventBus.emit(PhaserEvents.TimespeedChanged, { timeScale: nextTimeScale });
    return true;
  }

  public update(time: number, delta: number) {
    if (this.isPaused) {
      this.elapsedFrameTime = 0;
      return;
    }

    // 物理与逻辑推进只依赖 update 的 delta，这里用 GameScene 的时钟倍率驱动时间流速。
    const timeScale = this.scene?.time?.timeScale ?? 1;
    this.elapsedFrameTime += delta * timeScale;

    // Fixed-step physics update.
    while (this.elapsedFrameTime >= SyncManager.Instance.FrameInterval) {
      // 在进入下一次 Rapier step 前再执行延迟创建/销毁，
      // 避免在 world.step / bodies.forEach 相关借用期间修改物理世界。
      DeferredManager.Instance.flush();

      const frameReady = SyncManager.Instance.update();

      if (!frameReady) {
        break;
      }
      this.elapsedFrameTime -= SyncManager.Instance.FrameInterval;
      // Tick-based systems.
      if (!this.isPaused) {
        TickerManager.Instance.Update();
        CardpileManager.Instance.stepUpdate();
      }

      // Physics-step systems.
      if (!this.isPaused) {
        this.scene?.rapierWorld?.step(this.scene.rapierEventQueue);
        // Drain collision events.
        this.scene?.rapierEventQueue.drainCollisionEvents((handle1: number, handle2: number, started: boolean) => {
          console.log(`Collision event: handle1=${handle1}, handle2=${handle2}, started=${started}`);
          if (started) {
            this.scene?.handleCollision(handle1, handle2);
          }
        });

        // Sync entity logical positions from physics bodies.
        this.scene?.rapierWorld?.bodies.forEach(rigidBody => {
          const position = rigidBody.translation();
          const gameObject = rigidBody.userData;
          if (gameObject instanceof BaseEntity) {
            gameObject.stepUpdate();
            gameObject.updateView(position);
          }
        });
      }

    }

    if (!this.isPaused) {
      const interpolationAlpha = Math.min(
        this.elapsedFrameTime / SyncManager.Instance.FrameInterval,
        1,
      );
      this.scene?.rapierWorld?.bodies.forEach(rigidBody => {
        const gameObject = rigidBody.userData;
        if (gameObject instanceof BaseEntity) {
          gameObject.stepMove(interpolationAlpha);
        }
      });
    }

    // Regular per-render work.
    SyncManager.Instance.sendQueue.Consume();
  }
}
