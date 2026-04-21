import { EventBus } from "../../../utils/eventBus";
import { PlantEntity } from "../../models/entities/PlantEntity";
import PlantHelper from "../../utils/helper/PlantHelper";
import { BaseManager } from "../BaseManager";
import { DeferredManager } from "../DeferredManager";
import { PlantLibrary } from "../library/PlantLibrary";
import CardpileManager from "./CardpileManager";
import CursorManager from "./CursorManager";
import GridManager from "./GridManager";
import ResourceManager, { PlayerIdentify } from "./ResourceManager";
import SyncManager from "./SyncManager";

type PlantsManagerEvent = {
  // 用户决定操作事件，之后要在send_queue监听
  onDeterminePlant: (pid: number, level: number, col: number, row: number, cost: number) => void;
  onDetermineUseStarShards: (pid: number, col: number, row: number, cost: number) => void;
  onDetermineRemovePlant: (pid: number, col: number, row: number) => void;

  // sfx 反馈，没能量但是想种植高昂植物
  onEnergyInsufficient: () => void;
  onStarshardsInsufficient: () => void;
}

export default class PlantsManager extends BaseManager {
  private static _instance: PlantsManager;

  public EventBus: EventBus<PlantsManagerEvent>;

  PlantsMap: Map<string, Array<PlantEntity>> = new Map();

  constructor() {
    super();

    this.PlantsMap = new Map();
    this.EventBus = new EventBus<PlantsManagerEvent>();
  }

  public Load(): void {
    CursorManager.Instance.EventBus.on('onAttemptPlant', this.handleAttemptPlant);
    CursorManager.Instance.EventBus.on('onAttemptUseStarShards', this.handleAttemptUseStarShards);
    CursorManager.Instance.EventBus.on('onAttemptRemovePlant', this.handleAttemptRemovePlant);

    SyncManager.Instance.Eventbus.on('onRequestPlant', this.PlantCard);
    SyncManager.Instance.Eventbus.on('onRequestUseStarShards', this.LaunchStarShards);
    SyncManager.Instance.Eventbus.on('onRequestRemovePlant', this.UprootPlant);
  }

  public Reset() {
    CursorManager.Instance.EventBus.off('onAttemptPlant', this.handleAttemptPlant);
    CursorManager.Instance.EventBus.off('onAttemptUseStarShards', this.handleAttemptUseStarShards);
    CursorManager.Instance.EventBus.off('onAttemptRemovePlant', this.handleAttemptRemovePlant);
    SyncManager.Instance.Eventbus.off('onRequestPlant', this.PlantCard);
    SyncManager.Instance.Eventbus.off('onRequestUseStarShards', this.LaunchStarShards);
    SyncManager.Instance.Eventbus.off('onRequestRemovePlant', this.UprootPlant);
    this.PlantsMap.clear();
    this.EventBus.removeAllListeners();
    this.scene = null;
  }

  public static get Instance(): PlantsManager {
    if (!this._instance) {
      this._instance = new PlantsManager();
    }
    return this._instance;
  }

  // 从管理器注册植物
  public RegisterPlant(plant: PlantEntity) {
    const key = `${plant.col}-${plant.row}`;
    if (!this.PlantsMap.has(key)) {
      this.PlantsMap.set(key, [plant]);
    } else {
      this.PlantsMap.get(key)?.push(plant);
    }
  }

  // 从管理器注销植物
  public RegisterDestroy(plant: PlantEntity) {
    const key = `${plant.col}-${plant.row}`;
    if (this.PlantsMap.has(key)) {
      const list = this.PlantsMap.get(key);
      if (list) {
        const index = list.indexOf(plant);
        if (index >= 0) {
          list.splice(index, 1);
        }
        if (list.length === 0) {
          this.PlantsMap.delete(key);
        }
      }
    }
  }

  // 种植植物
  PlantCard = (playerId: PlayerIdentify, pid: number, level: number, col: number, row: number) => {
    if (!this.scene) return;
    const isGiftPlant = playerId === 9961;
    // 种植
    const model = PlantLibrary.GetModel(pid);
    if (!model) {
      console.error(`[SpawnPlant] Failed to spawn: Plant with pid ${pid} does not exist.`);
      return;
    }

    // 如果playerId为我，cardpile是否有这张牌，以及是否正在冷却
    if (!isGiftPlant && playerId === ResourceManager.Instance.mineId) {
      if (!CardpileManager.Instance.isCardActuallyReloaded(pid)) return;
    }

    const cost = model.cost.getValueAt(level);
    if (!isGiftPlant && !ResourceManager.Instance.ActualEnergySufficient(cost, playerId)) {
      if (playerId === ResourceManager.Instance.mineId) {
        this.EventBus.emit('onEnergyInsufficient');
      }
      return;
    }

    const existedPlants = this.PlantsMap.get(`${col}-${row}`) || [];
    const targetGridProperty = GridManager.Instance.GetGridProperty(col, row);

    // 如果格子属性不存在，默认不允许种植
    if (!targetGridProperty) return false;

    // 格子允许种植
    if (!PlantHelper.CanPlantInGrid(existedPlants, pid, targetGridProperty)) return;

    // 扣除资源，冷却等
    if (!isGiftPlant) {
      ResourceManager.Instance.UpdateEnergy(-cost, playerId);
    }
    if (!isGiftPlant && playerId === ResourceManager.Instance.mineId) {
      CardpileManager.Instance.reloadCard(pid);
    }

    DeferredManager.Instance.defer(() => {
      if (!this.scene) return;
      model.createEntity(this.scene, col, row, level);
    });
  }

  // 铲子移除植物
  private UprootPlant = (pid: number, col: number, row: number) => {
    DeferredManager.Instance.defer(() => {
      const key = `${col}-${row}`;
      if (this.PlantsMap.has(key)) {
        const list = this.PlantsMap.get(key);
        if (list) {
          const index = list.findIndex(plant => plant.model.pid === pid);
          if (index >= 0) {
            const plantObj = list[index];
            plantObj.destroy();
            list.splice(index, 1);
          }
          if (list.length === 0) {
            this.PlantsMap.delete(key);
          }
        }
      }
    });
  }

  // 启动星之碎片效果
  private LaunchStarShards = (playerId: PlayerIdentify, pid: number, col: number, row: number): boolean => {
    if (!ResourceManager.Instance.ActualStarShardsSufficient(1, playerId)) {
      return false;
    }

    const key = `${col}-${row}`;
    if (this.PlantsMap.has(key)) {
      const list = this.PlantsMap.get(key);
      if (list) {
        const index = list.findIndex(plant => plant.model.pid === pid);
        if (index >= 0) {
          const plantObj = list[index];
          // 扣除资源
          ResourceManager.Instance.UpdateStarShards(-1, playerId);
          DeferredManager.Instance.defer(() => {
            plantObj.model.onStarShards(plantObj);
          });

          return true;
        }
      }
    }
    return false;
  }

  handleAttemptUseStarShards = (col: number, row: number, aspect: 'up' | 'down') => {
    const plants = this.PlantsMap.get(`${col}-${row}`) || [];
    const targetPlant = PlantHelper.GetHighestPriorityPlant(plants, aspect);
    if (!targetPlant) return;
    // 如果星之碎片余量充足,则发动效果
    if (ResourceManager.Instance.StarShardsSufficient(1, 'mine')) {
      ResourceManager.Instance.ApplyPreviewStarShards(-1, 'mine');
      this.EventBus.emit('onDetermineUseStarShards', targetPlant.pid, col, row, 1);
    }
  }

  handleAttemptRemovePlant = (col: number, row: number, aspect: 'up' | 'down') => {
    const plants = this.PlantsMap.get(`${col}-${row}`) || [];
    const targetPlant = PlantHelper.GetHighestPriorityPlant(plants, aspect);
    if (!targetPlant) return;
    this.EventBus.emit('onDetermineRemovePlant', targetPlant.pid, col, row);
  }

  handleAttemptPlant = (col: number, row: number) => {
    const [pid, level] = CardpileManager.Instance.prePlantPid || [];
    if (pid === undefined || level === undefined) return;
    // cardpile是否有这张牌，以及是否正在冷却
    if (!CardpileManager.Instance.isCardDisplayReloaded(pid)) return;

    // 阳光是否存在
    const model = PlantLibrary.GetModel(pid);
    if (!model) {
      console.error(`[AttemptPlant] Failed to attempt plant: Plant with pid ${pid} does not exist.`);
      return;
    }
    const cost = model.cost.getValueAt(level);
    if (!ResourceManager.Instance.EnergySufficient(cost, 'mine')) {
      this.EventBus.emit('onEnergyInsufficient');
      return;
    }

    const existedPlants = this.PlantsMap.get(`${col}-${row}`) || [];
    const targetGridProperty = GridManager.Instance.GetGridProperty(col, row);

    // 如果格子属性不存在，默认不允许种植
    if (!targetGridProperty) return false;

    // 格子允许种植
    if (!PlantHelper.CanPlantInGrid(existedPlants, pid, targetGridProperty)) return;

    ResourceManager.Instance.ApplyPreviewEnergy(-cost, 'mine');
    CardpileManager.Instance.previewReloadCard(pid);

    // 种植
    this.EventBus.emit('onDeterminePlant', pid, level, col, row, cost);
  }
}
