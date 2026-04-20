import { EventBus } from "../../../utils/eventBus";
import BackendWS from "../../../utils/net/sync";
import type { Game } from "../../scenes/Game";
import { BaseManager } from "../BaseManager";
import CombatManager from "../CombatManager";
import { PlantLibrary } from "../library/PlantLibrary";
import SyncManager from "./SyncManager";

type CardpileManagerEvent = {
  onChosenCard: (pid: number, level: number) => void;
  onChosenPickaxe: () => void;
  onChosenStarShards: () => void;
  onCancelChosen: () => void;

  onCooldownStatus: (
    status: Map<number, {
      hasReloaded: boolean; // 是否已经完成冷却
      leftPercent: number; // 剩余冷却时间百分比，0-1
    }>
  ) => void;
}

export default class CardpileManager extends BaseManager {
  private static _instance: CardpileManager;
  protected scene: Game | null = null;

  public EventBus: EventBus<CardpileManagerEvent>;

  // 卡槽中选中的植物(可为null)
  prePlantPid: [number, number] | null = null; // [pid,level] | null
  // 星之碎片
  useStarShards: boolean = false;
  // 铁镐
  usePickaxe: boolean = false;

  // 卡槽状态
  cardpileStatus: Map<number, {
    level: number; // 卡片等级
    leftMs: number; // 剩余冷却时间，单位毫秒
    totalMs: number; // 总冷却时间，单位毫秒
  }> = new Map();
  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer) => {
    if (pointer.rightButtonReleased()) {
      this.handleRightClick();
    }
  };

  constructor() {
    super();
    this.EventBus = new EventBus<CardpileManagerEvent>();
  }

  public Load(): void {
    // FUTURE: 当前版本卡片槽位依然是外置的，因此先监听这些全局事件用来发送 选择卡片的消息，
    // 后续版本如果卡片槽位组件化了，这些事件就可以直接在组件内发出，不需要通过全局事件总线了

    // 获取本用户选择的卡组并更新
    const chosenPlants = this.scene?.params.plants || [];
    chosenPlants.forEach(({ pid, level }) => {
      const plantModel = PlantLibrary.GetModel(pid);
      if (plantModel) {
        const totalMs = plantModel.cooldown.getValueAt(level);
        const leftMs = plantModel.cooldownStartAtRatio * totalMs;
        this.cardpileStatus.set(pid, {
          level,
          leftMs,
          totalMs,
        });
      }
    });


    // 监听右键取消选择以取消高亮
    this.scene?.input.on('pointerup', this.handlePointerUp);
  }

  public setScene(scene: Game) {
    this.scene = scene;
  }

  public static get Instance(): CardpileManager {
    if (!this._instance) {
      this._instance = new CardpileManager();
    }
    return this._instance;
  }

  public Reset() {
    this.scene?.input.off('pointerup', this.handlePointerUp);
    this.prePlantPid = null;
    this.useStarShards = false;
    this.usePickaxe = false;
    this.cardpileStatus.clear();
    this.EventBus.removeAllListeners();
    this.scene = null;
  }

  stepUpdate() {
    const elasp = SyncManager.Instance.FrameInterval;
    const newStatus = new Map<number, {
      hasReloaded: boolean;
      leftPercent: number;
    }>();

    for (const pid of this.cardpileStatus.keys()) {
      const status = this.cardpileStatus.get(pid);
      if (status) {
        const { leftMs, totalMs } = status;
        const newLeftMs = Math.max(0, leftMs - elasp);
        this.cardpileStatus.set(pid, {
          ...status,
          leftMs: newLeftMs,
        });
        newStatus.set(pid, {
          hasReloaded: newLeftMs === 0,
          leftPercent: totalMs > 0 ? newLeftMs / totalMs : 0,
        });
      }
    }
    this.EventBus.emit('onCooldownStatus', newStatus);
  }

  reloadCard(pid: number) {
    // 开始冷却某张卡片，通常在使用后调用
    const status = this.cardpileStatus.get(pid);
    if (status) {
      status.leftMs = status.totalMs;
      this.cardpileStatus.set(pid, status);
    }
  }

  // 获得当前选择的对象，用于左键后执行
  public GetCurrentChoice(): {
    type: 'plant' | 'pickaxe' | 'starshards' | null;
    pid?: number;
    level?: number;
  } {
    if (this.prePlantPid) {
      return {
        type: 'plant',
        pid: this.prePlantPid[0],
        level: this.prePlantPid[1],
      };
    } else if (this.usePickaxe) {
      return {
        type: 'pickaxe',
      };
    } else if (this.useStarShards) {
      return {
        type: 'starshards',
      };
    } else {
      return {
        type: null,
      };
    }
  }

  cancelSelection() {
    // 取消选择
    this.prePlantPid = null;
    this.useStarShards = false;
    this.usePickaxe = false;
  }

  private handleRightClick() {
    // 取消选择
    this.cancelSelection();
    this.EventBus.emit('onCancelChosen');
  }

  ClickCard(pid: number, level: number) {
    if (!this.CouldOperateCardpile()) {
      return;
    }

    // 如果点击的是相同的卡片，那么取消选择
    if (this.prePlantPid && this.prePlantPid[0] === pid) {
      this.cancelSelection();
      this.EventBus.emit('onCancelChosen');
      return;
    }
    // 选择卡片
    this.cancelSelection();
    this.prePlantPid = [pid, level];
    this.EventBus.emit('onChosenCard', pid, level);
  }

  ClickPickaxe() {
    if (!this.CouldOperateCardpile()) {
      return;
    }
    // 如果已经选中，那么再次点击镐子会取消选择
    if (this.usePickaxe) {
      this.cancelSelection();
      this.EventBus.emit('onCancelChosen');
      return;
    }

    // 选择镐
    this.cancelSelection();
    this.usePickaxe = true;
    this.EventBus.emit('onChosenPickaxe');
  }

  ClickStarShards() {
    if (!this.CouldOperateCardpile()) {
      return;
    }
    // 如果已经选中，那么再次点击星碎会取消选择
    if (this.useStarShards) {
      this.cancelSelection();
      this.EventBus.emit('onCancelChosen');
      return;
    }
    // 选择星星碎片
    this.cancelSelection();
    this.useStarShards = true;
    this.EventBus.emit('onChosenStarShards');
  }

  CouldOperateCardpile(): boolean {
    // 当前是否能够操作卡片槽，主要用于控制在某些状态下（比如游戏暂停）无法选择卡片
    if (!this.scene) return false;
    if (CombatManager.Instance.isGameEnd) return false;
    if (this.scene.params.gameSettings.isBluePrint && !BackendWS.isOnlineMode()) {
      return true; // 蓝图模式下离线仍然可以操作卡片槽
    }
    return CombatManager.Instance.isPaused === false;
  }
}
