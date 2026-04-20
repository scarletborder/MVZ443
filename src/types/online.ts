/**
 * 在线状态相关的类型定义
 */

// 玩家信息（与后端 PeerInfo 结构对应）
export interface PeerInfo {
    addr: string; // 连接地址，如 "192.168.1.100:12345"
    id: number;   // 玩家ID
}

// 房间信息
export interface RoomInfo {
    roomId: number;
    myId: number;
    lordId: number;
    peers: string;              // 原始JSON字符串
    peersData: PeerInfo[] | null; // 解析后的玩家数据
    playerCount: number;        // 玩家数量
}

// 游戏阶段枚举（与后端保持一致）
export enum GameStage {
    InLobby = 0x20,   // 大厅/等待中
    Preparing = 0x21, // 准备中（选卡阶段）
    Loading = 0x22,   // 加载中
    InGame = 0x23,    // 游戏中
    PostGame = 0x24,  // 游戏后结算
    Closed = 0xEE,    // 房间关闭
    Error = 0xFF      // 错误状态
}

// EventBus 事件数据类型
export interface LobbyJoinSuccessEvent {
    roomId: number;
    myId: number;
    key: string;
    message: string;
}

export interface RoomChooseMapEvent {
    chapterId: number;
    stageId: number;
}

export interface RoomUpdateReadyCountEvent {
    readyCount: number;
    totalPlayers: number;
}

export interface RoomAllReadyEvent {
    allPlayerCount: number;
    seed: number;
    myId: number;
    playerIds: number[];
}

export interface RoomGameStartEvent {
    seed: number;
    myID: number;
}

export interface RoomGameEndEvent {
    isWin: boolean;
}

export interface RoomClosedEvent {
    message: string;
}

export interface RoomErrorEvent {
    message: string;
}
