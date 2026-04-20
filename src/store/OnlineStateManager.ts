import EnumGameStage from '../utils/net/game_state';
import { PeerInfo, RoomAllReadyEvent } from '../types/online';

type RoomInfoListener = (roomInfo: { roomId: number; myId: number; lordId: number; peers: string }) => void;

export class OnlineStateManager {
    private static instance: OnlineStateManager;

    private currentGameStage: number = EnumGameStage.InLobby;
    private isOnlineMode: boolean = false;
    private roomId: number = -1;
    private myId: number = 51;
    private lordId: number = 50;
    private connectionKey: string = "";
    private roomPeers: string = "";
    private latestRoomAllReady: RoomAllReadyEvent | null = null;

    private gameStageUpdateCallbacks: Array<(gameStage: number) => void> = [];
    private onlineModeUpdateCallbacks: Array<(isOnline: boolean) => void> = [];
    private roomInfoUpdateCallbacks: RoomInfoListener[] = [];

    private constructor() { }

    public static getInstance(): OnlineStateManager {
        if (!OnlineStateManager.instance) {
            OnlineStateManager.instance = new OnlineStateManager();
        }
        return OnlineStateManager.instance;
    }

    public getCurrentGameStage(): number {
        return this.currentGameStage;
    }

    public updateGameStage(gameStage: number): void {
        this.currentGameStage = gameStage;
        this.gameStageUpdateCallbacks.forEach(callback => callback(gameStage));
    }

    public getIsOnlineMode(): boolean {
        return this.isOnlineMode;
    }

    public updateOnlineMode(isOnline: boolean): void {
        this.isOnlineMode = isOnline;
        this.onlineModeUpdateCallbacks.forEach(callback => callback(isOnline));
    }

    public getRoomInfo(): { roomId: number; myId: number; lordId: number; peers: string } {
        return {
            roomId: this.roomId,
            myId: this.myId,
            lordId: this.lordId,
            peers: this.roomPeers
        };
    }

    public updateRoomInfo(roomId: number, myId: number, lordId: number, peers?: string): void {
        this.roomId = roomId;
        this.myId = myId;
        this.lordId = lordId;
        if (peers !== undefined) {
            this.roomPeers = peers;
        }

        const roomInfo = { roomId, myId, lordId, peers: this.roomPeers };
        this.roomInfoUpdateCallbacks.forEach(callback => callback(roomInfo));
    }

    public getConnectionKey(): string {
        return this.connectionKey;
    }

    public updateConnectionKey(key: string): void {
        this.connectionKey = key;
    }

    public updateRoomAllReady(data: RoomAllReadyEvent): void {
        this.latestRoomAllReady = {
            allPlayerCount: data.allPlayerCount,
            seed: data.seed,
            myId: data.myId,
            playerIds: [...data.playerIds]
        };
    }

    public getRoomAllReady(): RoomAllReadyEvent | null {
        if (!this.latestRoomAllReady) {
            return null;
        }

        return {
            allPlayerCount: this.latestRoomAllReady.allPlayerCount,
            seed: this.latestRoomAllReady.seed,
            myId: this.latestRoomAllReady.myId,
            playerIds: [...this.latestRoomAllReady.playerIds]
        };
    }

    public getRoomPeers(): string {
        return this.roomPeers;
    }

    public getRoomPeersData(): PeerInfo[] | null {
        try {
            const peersData = JSON.parse(this.roomPeers);
            if (Array.isArray(peersData)) {
                return peersData as PeerInfo[];
            }
            return null;
        } catch (e) {
            console.warn('Failed to parse peers JSON:', this.roomPeers, e);
            return null;
        }
    }

    public getPlayerCount(): number {
        const peersData = this.getRoomPeersData();
        return peersData ? peersData.length : 0;
    }

    public findPlayerById(playerId: number): PeerInfo | null {
        const peersData = this.getRoomPeersData();
        if (!peersData) return null;
        return peersData.find(peer => peer.id === playerId) || null;
    }

    public isPlayerInRoom(playerId: number): boolean {
        return this.findPlayerById(playerId) !== null;
    }

    public isLord(): boolean {
        return this.myId === this.lordId;
    }

    public isInLobby(): boolean {
        return this.currentGameStage === EnumGameStage.InLobby;
    }

    public isPreparing(): boolean {
        return this.currentGameStage === EnumGameStage.Preparing;
    }

    public isLoading(): boolean {
        return this.currentGameStage === EnumGameStage.Loading;
    }

    public isInGame(): boolean {
        return this.currentGameStage === EnumGameStage.InGame;
    }

    public isPostGame(): boolean {
        return this.currentGameStage === EnumGameStage.PostGame;
    }

    public getGameStageName(): string {
        switch (this.currentGameStage) {
            case EnumGameStage.InLobby:
                return 'InLobby';
            case EnumGameStage.Preparing:
                return 'Preparing';
            case EnumGameStage.Loading:
                return 'Loading';
            case EnumGameStage.InGame:
                return 'InGame';
            case EnumGameStage.PostGame:
                return 'PostGame';
            default:
                return 'Unknown';
        }
    }

    public resetGameData(): void {
        this.currentGameStage = EnumGameStage.InLobby;
        this.latestRoomAllReady = null;
    }

    public resetAllState(): void {
        this.resetGameData();
        this.isOnlineMode = false;
        this.roomId = -1;
        this.myId = 51;
        this.lordId = 50;
        this.connectionKey = "";
        this.roomPeers = "";
    }

    public onGameStageUpdate(callback: (gameStage: number) => void): void {
        this.gameStageUpdateCallbacks.push(callback);
    }

    public removeGameStageUpdateListener(callback: (gameStage: number) => void): void {
        const index = this.gameStageUpdateCallbacks.indexOf(callback);
        if (index > -1) {
            this.gameStageUpdateCallbacks.splice(index, 1);
        }
    }

    public onOnlineModeUpdate(callback: (isOnline: boolean) => void): void {
        this.onlineModeUpdateCallbacks.push(callback);
    }

    public removeOnlineModeUpdateListener(callback: (isOnline: boolean) => void): void {
        const index = this.onlineModeUpdateCallbacks.indexOf(callback);
        if (index > -1) {
            this.onlineModeUpdateCallbacks.splice(index, 1);
        }
    }

    public onRoomInfoUpdate(callback: RoomInfoListener): void {
        this.roomInfoUpdateCallbacks.push(callback);
    }

    public removeRoomInfoUpdateListener(callback: RoomInfoListener): void {
        const index = this.roomInfoUpdateCallbacks.indexOf(callback);
        if (index > -1) {
            this.roomInfoUpdateCallbacks.splice(index, 1);
        }
    }
}

export const onlineStateManager = OnlineStateManager.getInstance();
