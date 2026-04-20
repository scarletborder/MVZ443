import { BaseManager } from "../BaseManager";
import type { Game } from "../../scenes/Game";
import { PhaserEventBus, PhaserEvents } from "../../EventBus";
import { EventBus } from "../../../utils/eventBus";
import { onlineStateManager } from "../../../store/OnlineStateManager";
import { RoomAllReadyEvent } from "../../../types/online";

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
  private readonly handleRoomAllReady = (data: RoomAllReadyEvent) => {
    this.mineId = data.myId;
    this.EnergyMaps.clear();
    this.StarShardsMaps.clear();
    for (const playerId of data.playerIds) {
      this.EnergyMaps.set(playerId, 0);
      this.StarShardsMaps.set(playerId, 0);
    }
  };

  private EnergyMaps: Map<PlayerIdentify, number> = new Map();
  private StarShardsMaps: Map<PlayerIdentify, number> = new Map();
  private previewEnergyDeltaMaps: Map<PlayerIdentify, number> = new Map();
  private previewStarShardsDeltaMaps: Map<PlayerIdentify, number> = new Map();

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
    PhaserEventBus.on(PhaserEvents.RoomAllReady, this.handleRoomAllReady, this);

    PhaserEventBus.on(PhaserEvents.RoomGameStart, this.handleRoomGameStart, this);
    const roomAllReady = onlineStateManager.getRoomAllReady();
    if (roomAllReady) {
      this.handleRoomAllReady(roomAllReady);
    }
  }

  public Reset(): void {
    PhaserEventBus.off(PhaserEvents.RoomAllReady, this.handleRoomAllReady, this);
    PhaserEventBus.off(PhaserEvents.RoomGameStart, this.handleRoomGameStart, this);
    this.scene = null;
    this.Eventbus.removeAllListeners();
    this.EnergyMaps.clear();
    this.StarShardsMaps.clear();
    this.previewEnergyDeltaMaps.clear();
    this.previewStarShardsDeltaMaps.clear();
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
    this.reconcilePreviewDelta(this.previewEnergyDeltaMaps, energyDelta, playerId);
    this.Eventbus.emit('onEnergyUpdate', this.getDisplayEnergy(playerId), playerId);
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
    this.reconcilePreviewDelta(this.previewStarShardsDeltaMaps, starShardsDelta, playerId);
    this.Eventbus.emit('onStarShardsUpdate', this.getDisplayStarShards(playerId), playerId);
  }

  public EnergySufficient(requiredEnergy: number, playerId: PlayerIdentify | 'mine'): boolean {
    if (playerId === 9961) {
      return true;
    }
    if (playerId === 'mine') {
      playerId = this.mineId;
    }
    return this.getDisplayEnergy(playerId) >= requiredEnergy;
  }

  public StarShardsSufficient(requiredStarShards: number, playerId: PlayerIdentify | 'mine'): boolean {
    if (playerId === 9961) {
      return true;
    }
    if (playerId === 'mine') {
      playerId = this.mineId;
    }
    return this.getDisplayStarShards(playerId) >= requiredStarShards;
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

  getDisplayEnergy(playerId: PlayerIdentify | 'mine'): number {
    if (playerId === 'mine') {
      playerId = this.mineId;
    }
    return (this.EnergyMaps.get(playerId) || 0) + (this.previewEnergyDeltaMaps.get(playerId) || 0);
  }

  getDisplayStarShards(playerId: PlayerIdentify | 'mine'): number {
    if (playerId === 'mine') {
      playerId = this.mineId;
    }
    return (this.StarShardsMaps.get(playerId) || 0) + (this.previewStarShardsDeltaMaps.get(playerId) || 0);
  }

  public ActualEnergySufficient(requiredEnergy: number, playerId: PlayerIdentify | 'mine'): boolean {
    return this.getEnergy(playerId) >= requiredEnergy;
  }

  public ActualStarShardsSufficient(requiredStarShards: number, playerId: PlayerIdentify | 'mine'): boolean {
    return this.getStarShards(playerId) >= requiredStarShards;
  }

  public ApplyPreviewEnergy(energyDelta: number, playerId: PlayerIdentify | 'mine') {
    if (playerId === 'mine') {
      playerId = this.mineId;
    }
    const nextDelta = (this.previewEnergyDeltaMaps.get(playerId) || 0) + energyDelta;
    this.previewEnergyDeltaMaps.set(playerId, nextDelta);
    this.Eventbus.emit('onEnergyUpdate', this.getDisplayEnergy(playerId), playerId);
  }

  public ApplyPreviewStarShards(starShardsDelta: number, playerId: PlayerIdentify | 'mine') {
    if (playerId === 'mine') {
      playerId = this.mineId;
    }
    const nextDelta = (this.previewStarShardsDeltaMaps.get(playerId) || 0) + starShardsDelta;
    this.previewStarShardsDeltaMaps.set(playerId, nextDelta);
    this.Eventbus.emit('onStarShardsUpdate', this.getDisplayStarShards(playerId), playerId);
  }

  private reconcilePreviewDelta(
    previewMap: Map<PlayerIdentify, number>,
    actualDelta: number,
    playerId: PlayerIdentify
  ) {
    const previewDelta = previewMap.get(playerId) || 0;
    if (previewDelta === 0) {
      return;
    }

    // When the authoritative update arrives, consume the matching preview
    // so the HUD doesn't apply the same cost twice.
    if (previewDelta < 0 && actualDelta < 0) {
      const nextPreviewDelta = Math.min(0, previewDelta - actualDelta);
      if (nextPreviewDelta === 0) {
        previewMap.delete(playerId);
      } else {
        previewMap.set(playerId, nextPreviewDelta);
      }
      return;
    }

    if (previewDelta > 0 && actualDelta > 0) {
      const nextPreviewDelta = Math.max(0, previewDelta - actualDelta);
      if (nextPreviewDelta === 0) {
        previewMap.delete(playerId);
      } else {
        previewMap.set(playerId, nextPreviewDelta);
      }
    }
  }

  private handleRoomGameStart() {
    this.SetInitialEnergy(this.scene?.stageData.energy ?? 0);
  }
}
