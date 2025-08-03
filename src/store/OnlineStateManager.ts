/**
 * 在线状态管理器
 * 管理WebSocket连接状态、房间状态、游戏阶段等在线相关状态
 */
import EnumGameStage from '../utils/net/game_state';

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

    // 帧相关状态
    private frameId: number = 0;
    private ackFrameId: number = 0;

    // 状态更新回调
    private gameStageUpdateCallbacks: ((gameStage: number) => void)[] = [];
    private onlineModeUpdateCallbacks: ((isOnline: boolean) => void)[] = [];
    private roomInfoUpdateCallbacks: ((roomInfo: { roomId: number; myId: number; lordId: number }) => void)[] = [];
    private frameIdUpdateCallbacks: ((frameId: number) => void)[] = [];

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
    public getRoomInfo(): { roomId: number; myId: number; lordId: number } {
        return {
            roomId: this.roomId,
            myId: this.myId,
            lordId: this.lordId
        };
    }

    /**
     * 更新房间信息
     */
    public updateRoomInfo(roomId: number, myId: number, lordId: number): void {
        this.roomId = roomId;
        this.myId = myId;
        this.lordId = lordId;

        const roomInfo = { roomId, myId, lordId };
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
     * 获取当前帧ID
     */
    public getFrameId(): number {
        return this.frameId;
    }

    /**
     * 获取下一帧ID
     */
    public getNextFrameId(): number {
        return this.frameId + 1;
    }

    /**
     * 更新帧ID
     */
    public updateFrameId(frameId: number): void {
        this.frameId = frameId;
        // 通知所有监听器
        this.frameIdUpdateCallbacks.forEach(callback => callback(frameId));
    }

    /**
     * 跳转到指定帧ID
     */
    public goToFrameId(target: number = this.frameId + 1): void {
        this.updateFrameId(target);
    }

    /**
     * 获取确认帧ID
     */
    public getAckFrameId(): number {
        return this.ackFrameId;
    }

    /**
     * 更新确认帧ID
     */
    public updateAckFrameId(ackFrameId: number): void {
        this.ackFrameId = ackFrameId;
    }

    /**
     * 判断是否为房主
     */
    public isLord(): boolean {
        return this.myId === this.lordId;
    }

    /**
     * 重置游戏数据
     * 在游戏结束后/刚加入房间时/退出房间时调用
     */
    public resetGameData(): void {
        this.frameId = 0;
        this.ackFrameId = 0;
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
    public onRoomInfoUpdate(callback: (roomInfo: { roomId: number; myId: number; lordId: number }) => void): void {
        this.roomInfoUpdateCallbacks.push(callback);
    }

    /**
     * 移除房间信息更新监听器
     */
    public removeRoomInfoUpdateListener(callback: (roomInfo: { roomId: number; myId: number; lordId: number }) => void): void {
        const index = this.roomInfoUpdateCallbacks.indexOf(callback);
        if (index > -1) {
            this.roomInfoUpdateCallbacks.splice(index, 1);
        }
    }

    /**
     * 注册帧ID更新监听器
     */
    public onFrameIdUpdate(callback: (frameId: number) => void): void {
        this.frameIdUpdateCallbacks.push(callback);
    }

    /**
     * 移除帧ID更新监听器
     */
    public removeFrameIdUpdateListener(callback: (frameId: number) => void): void {
        const index = this.frameIdUpdateCallbacks.indexOf(callback);
        if (index > -1) {
            this.frameIdUpdateCallbacks.splice(index, 1);
        }
    }
}

// 导出单例实例
export const onlineStateManager = OnlineStateManager.getInstance();
