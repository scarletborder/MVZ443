/**
 * 在线状态管理器
 * 管理WebSocket连接状态、房间状态、游戏阶段等在线相关状态
 */
import EnumGameStage from '../utils/net/game_state';
import { PeerInfo } from '../types/online';

export class OnlineStateManager {
    private static instance: OnlineStateManager;

    // 游戏阶段状态
    private currentGameStage: number = EnumGameStage.InLobby;

    // 连接状态
    private isOnlineMode: boolean = false;
    private roomId: number = -1;
    private myId: number = 51;
    private lordId: number = 50;
    private connectionKey: string = "";
    private roomPeers: string = ""; // 房间内玩家情况的JSON字符串

    // 状态更新回调
    private gameStageUpdateCallbacks: ((gameStage: number) => void)[] = [];
    private onlineModeUpdateCallbacks: ((isOnline: boolean) => void)[] = [];
    private roomInfoUpdateCallbacks: ((roomInfo: { roomId: number; myId: number; lordId: number; peers: string }) => void)[] = [];

    private constructor() { }

    public static getInstance(): OnlineStateManager {
        if (!OnlineStateManager.instance) {
            OnlineStateManager.instance = new OnlineStateManager();
        }
        return OnlineStateManager.instance;
    }

    /**
     * 获取当前游戏阶段
     */
    public getCurrentGameStage(): number {
        return this.currentGameStage;
    }

    /**
     * 更新游戏阶段
     */
    public updateGameStage(gameStage: number): void {
        this.currentGameStage = gameStage;
        // 通知所有监听器
        this.gameStageUpdateCallbacks.forEach(callback => callback(gameStage));
    }

    /**
     * 获取在线模式状态
     */
    public getIsOnlineMode(): boolean {
        return this.isOnlineMode;
    }

    /**
     * 更新在线模式状态
     */
    public updateOnlineMode(isOnline: boolean): void {
        this.isOnlineMode = isOnline;
        // 通知所有监听器
        this.onlineModeUpdateCallbacks.forEach(callback => callback(isOnline));
    }

    /**
     * 获取房间信息
     */
    public getRoomInfo(): { roomId: number; myId: number; lordId: number; peers: string } {
        return {
            roomId: this.roomId,
            myId: this.myId,
            lordId: this.lordId,
            peers: this.roomPeers
        };
    }

    /**
     * 更新房间信息
     */
    public updateRoomInfo(roomId: number, myId: number, lordId: number, peers?: string): void {
        this.roomId = roomId;
        this.myId = myId;
        this.lordId = lordId;
        if (peers !== undefined) {
            this.roomPeers = peers;
        }

        const roomInfo = { roomId, myId, lordId, peers: this.roomPeers };
        // 通知所有监听器
        this.roomInfoUpdateCallbacks.forEach(callback => callback(roomInfo));
    }

    /**
     * 获取连接密钥
     */
    public getConnectionKey(): string {
        return this.connectionKey;
    }

    /**
     * 更新连接密钥
     */
    public updateConnectionKey(key: string): void {
        this.connectionKey = key;
    }

    /**
     * 获取房间玩家信息（JSON字符串）
     */
    public getRoomPeers(): string {
        return this.roomPeers;
    }

    /**
     * 获取解析后的房间玩家信息
     */
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

    /**
     * 获取当前房间玩家数量
     */
    public getPlayerCount(): number {
        const peersData = this.getRoomPeersData();
        return peersData ? peersData.length : 0;
    }

    /**
     * 根据ID查找玩家信息
     */
    public findPlayerById(playerId: number): PeerInfo | null {
        const peersData = this.getRoomPeersData();
        if (!peersData) return null;
        return peersData.find(peer => peer.id === playerId) || null;
    }

    /**
     * 检查指定玩家是否在房间中
     */
    public isPlayerInRoom(playerId: number): boolean {
        return this.findPlayerById(playerId) !== null;
    }

    /**
     * 判断是否为房主
     */
    public isLord(): boolean {
        return this.myId === this.lordId;
    }

    /**
     * 判断是否在大厅中
     */
    public isInLobby(): boolean {
        return this.currentGameStage === EnumGameStage.InLobby;
    }

    /**
     * 判断是否在准备阶段（选卡阶段）
     */
    public isPreparing(): boolean {
        return this.currentGameStage === EnumGameStage.Preparing;
    }

    /**
     * 判断是否在加载阶段
     */
    public isLoading(): boolean {
        return this.currentGameStage === EnumGameStage.Loading;
    }

    /**
     * 判断是否在游戏中
     */
    public isInGame(): boolean {
        return this.currentGameStage === EnumGameStage.InGame;
    }

    /**
     * 判断是否在游戏结束阶段
     */
    public isPostGame(): boolean {
        return this.currentGameStage === EnumGameStage.PostGame;
    }

    /**
     * 获取游戏阶段名称（用于调试）
     */
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

    /**
     * 重置游戏数据
     * 在游戏结束后/刚加入房间时/退出房间时调用
     */
    public resetGameData(): void {
        this.currentGameStage = EnumGameStage.InLobby;
    }

    /**
     * 重置所有状态（包括连接状态）
     */
    public resetAllState(): void {
        this.resetGameData();
        this.isOnlineMode = false;
        this.roomId = -1;
        this.myId = 51;
        this.lordId = 50;
        this.connectionKey = "";
        this.roomPeers = "";
    }

    // 监听器管理方法

    /**
     * 注册游戏阶段更新监听器
     */
    public onGameStageUpdate(callback: (gameStage: number) => void): void {
        this.gameStageUpdateCallbacks.push(callback);
    }

    /**
     * 移除游戏阶段更新监听器
     */
    public removeGameStageUpdateListener(callback: (gameStage: number) => void): void {
        const index = this.gameStageUpdateCallbacks.indexOf(callback);
        if (index > -1) {
            this.gameStageUpdateCallbacks.splice(index, 1);
        }
    }

    /**
     * 注册在线模式更新监听器
     */
    public onOnlineModeUpdate(callback: (isOnline: boolean) => void): void {
        this.onlineModeUpdateCallbacks.push(callback);
    }

    /**
     * 移除在线模式更新监听器
     */
    public removeOnlineModeUpdateListener(callback: (isOnline: boolean) => void): void {
        const index = this.onlineModeUpdateCallbacks.indexOf(callback);
        if (index > -1) {
            this.onlineModeUpdateCallbacks.splice(index, 1);
        }
    }

    /**
     * 注册房间信息更新监听器
     */
    public onRoomInfoUpdate(callback: (roomInfo: { roomId: number; myId: number; lordId: number; peers: string }) => void): void {
        this.roomInfoUpdateCallbacks.push(callback);
    }

    /**
     * 移除房间信息更新监听器
     */
    public removeRoomInfoUpdateListener(callback: (roomInfo: { roomId: number; myId: number; lordId: number; peers: string }) => void): void {
        const index = this.roomInfoUpdateCallbacks.indexOf(callback);
        if (index > -1) {
            this.roomInfoUpdateCallbacks.splice(index, 1);
        }
    }

}

// 导出单例实例
export const onlineStateManager = OnlineStateManager.getInstance();
