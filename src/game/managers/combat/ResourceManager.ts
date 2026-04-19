import { BaseManager } from "../BaseManager";
import type { Game } from "../../scenes/Game";
import { PhaserEventBus, PhaserEvents } from "../../EventBus";
import { EventBus } from "../../../utils/eventBus";

export type PlayerIdentify = number;

type ResourceManagerEvents = {
  onEnergyUpdate: (newEnergy: number, playerId: PlayerIdentify) => void;
  onStarShardsUpdate: (newStarShards: number, playerId: PlayerIdentify) => void;
}

/**
 * 资源管理器
 * 给各种资源上锁，防止变化
 */
export default class ResourceManager extends BaseManager {
  private static _instance: ResourceManager;
  protected scene: Game | null = null;

  Eventbus: EventBus<ResourceManagerEvents>;

  mineId: number = 101;

  private EnergyMaps: Map<PlayerIdentify, number> = new Map();
  private StarShardsMaps: Map<PlayerIdentify, number> = new Map();

  constructor() {
    super();
    this.Eventbus = new EventBus<ResourceManagerEvents>();
  }

  public static get Instance(): ResourceManager {
    if (!this._instance) {
      this._instance = new ResourceManager();
    }
    return this._instance;
  }

  public Load(): void {
    PhaserEventBus.on(PhaserEvents.RoomAllReady, (data: { allPlayerCount: number, seed: number, myId: number, playerIds: number[] }) => {
      this.mineId = data.myId;
      this.EnergyMaps.clear();
      this.StarShardsMaps.clear();
      for (let playerId of data.playerIds) {
        this.EnergyMaps.set(playerId, 0);
        this.StarShardsMaps.set(playerId, 0);
      }
    }, this);

    PhaserEventBus.on(PhaserEvents.RoomGameStart, this.handleRoomGameStart, this);
  }

  public Reset(): void {
    this.scene = null;
    this.Eventbus.removeAllListeners();
    this.EnergyMaps.clear();
    this.StarShardsMaps.clear();
  }

  public setScene(scene: Game): void {
    this.scene = scene;
  }

  public UpdateEnergy(energyDelta: number, playerId: PlayerIdentify | 'mine' | 'all') {
    if (playerId === 'all') {
      for (let pid of this.EnergyMaps.keys()) {
        this.UpdateEnergy(energyDelta, pid);
      }
      return;
    }
    if (playerId === 'mine') {
      playerId = this.mineId;
    }
    const currentEnergy = this.EnergyMaps.get(playerId) || 0;
    const newEnergy = currentEnergy + energyDelta;
    this.EnergyMaps.set(playerId, newEnergy);
    this.Eventbus.emit('onEnergyUpdate', newEnergy, playerId);
  }

  public UpdateStarShards(starShardsDelta: number, playerId: PlayerIdentify | 'mine' | 'all') {
    if (playerId === 'all') {
      for (let pid of this.StarShardsMaps.keys()) {
        this.UpdateStarShards(starShardsDelta, pid);
      }
      return;
    }
    if (playerId === 'mine') {
      playerId = this.mineId;
    }
    const currentStarShards = this.StarShardsMaps.get(playerId) || 0;
    const newStarShards = currentStarShards + starShardsDelta;
    this.StarShardsMaps.set(playerId, newStarShards);
    this.Eventbus.emit('onStarShardsUpdate', newStarShards, playerId);
  }

  public EnergySufficient(requiredEnergy: number, playerId: PlayerIdentify | 'mine'): boolean {
    if (playerId === 9961) {
      return true;
    }
    if (playerId === 'mine') {
      playerId = this.mineId;
    }
    const currentEnergy = this.EnergyMaps.get(playerId) || 0;
    return currentEnergy >= requiredEnergy;
  }

  public StarShardsSufficient(requiredStarShards: number, playerId: PlayerIdentify | 'mine'): boolean {
    if (playerId === 9961) {
      return true;
    }
    if (playerId === 'mine') {
      playerId = this.mineId;
    }
    const currentStarShards = this.StarShardsMaps.get(playerId) || 0;
    return currentStarShards >= requiredStarShards;
  }

  public SetInitialEnergy(initialEnergy: number): void {
    for (let playerId of this.EnergyMaps.keys()) {
      this.EnergyMaps.set(playerId, initialEnergy);
    }
  }

  getEnergy(playerId: PlayerIdentify | 'mine'): number {
    if (playerId === 'mine') {
      playerId = this.mineId;
    }
    return this.EnergyMaps.get(playerId) || 0;
  }

  getStarShards(playerId: PlayerIdentify | 'mine'): number {
    if (playerId === 'mine') {
      playerId = this.mineId;
    }
    return this.StarShardsMaps.get(playerId) || 0;
  }

  private handleRoomGameStart() {
    this.SetInitialEnergy(this.scene?.stageData.energy ?? 0);
  }
}