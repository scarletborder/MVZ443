/**
 * WebSocket客户端消息处理器
 * 
 * 游戏状态流转：
 * 1. 连接阶段: 无状态 → joinRoomSuccess → InLobby
 * 2. 房间阶段: InLobby → chooseMap → Preparing → allReady → Loading → allLoaded → InGame
 * 3. 游戏阶段: InGame → gameEnd → PostGame
 * 4. 特殊情况: Preparing → quitChooseMap → InLobby
 * 5. 错误处理: 任何阶段 → error/roomClosed → 重置状态
 */
import { WebSocketClient } from "./sync";
import {
    InGameResponse,
    LobbyResponse,
    RoomResponse,
} from "../../pb/response";
import EnumGameStage from "./game_state";
import { EventBus } from "../../game/EventBus";
import { onlineStateManager } from "../../store/OnlineStateManager";
import { PeerInfo } from "../../types/online";

export default class WSClientHandlers {
    private ws: WebSocketClient;

    constructor(ws: WebSocketClient) {
        this.ws = ws;
    }

    public handleLobbyResponse(response: Uint8Array) {
        const lobbyResponse = LobbyResponse.fromBinary(response);

        switch (lobbyResponse.payload.oneofKind) {
            case 'joinRoomFailed':
                // 加入房间失败，保持离线状态
                onlineStateManager.updateOnlineMode(false);
                onlineStateManager.resetAllState();
                console.error('Join room failed:', lobbyResponse.payload.joinRoomFailed.message);
                alert(lobbyResponse.payload.joinRoomFailed.message);
                this.ws.closeConnection();
                break;
            case 'joinRoomSuccess':
                const joinRoomSuccess = lobbyResponse.payload.joinRoomSuccess;
                console.log('✅ joinRoomSuccess message received:', joinRoomSuccess);

                // 成功加入房间，进入在线模式并设置为大厅状态
                onlineStateManager.updateOnlineMode(true);
                onlineStateManager.updateGameStage(EnumGameStage.InLobby);
                onlineStateManager.updateRoomInfo(joinRoomSuccess.roomId, joinRoomSuccess.myId, 50); // lordId初始为50，会在roomInfo中更新
                onlineStateManager.updateConnectionKey(joinRoomSuccess.key);

                const keyText = joinRoomSuccess.key === "" ? "公开" : `密钥=${joinRoomSuccess.key}`;
                console.log(`✅ 连接成功, 房间号=${joinRoomSuccess.roomId} ${keyText}`);
                console.log('✅ OnlineMode updated to true, GameStage set to InLobby');

                // 通过EventBus通知React层
                EventBus.emit('lobby-join-success', {
                    roomId: joinRoomSuccess.roomId,
                    myId: joinRoomSuccess.myId,
                    key: joinRoomSuccess.key,
                    message: joinRoomSuccess.message
                });
                console.log('✅ lobby-join-success event emitted');
                break;
            default:
                console.error("Unknown lobby response type:", lobbyResponse.payload.oneofKind);
                break;
        }
    }

    // RoomResponse 处理
    // 不用进queue，直接监听后做事
    // 本地不靠这套逻辑来驱动ui
    // 本地的 room-game-start 将通过 single_recv 来传达
    public handleRoomResponse(response: Uint8Array) {
        const roomResponse = RoomResponse.fromBinary(response);

        switch (roomResponse.payload.oneofKind) {
            case 'roomInfo':
                const roomInfo = roomResponse.payload.roomInfo;
                onlineStateManager.updateRoomInfo(roomInfo.roomId, roomInfo.myId, roomInfo.lordId, roomInfo.peers);

                console.log('Room info received:', {
                    roomId: roomInfo.roomId,
                    myId: roomInfo.myId,
                    lordId: roomInfo.lordId,
                    peers: roomInfo.peers
                }, 'Current stage:', onlineStateManager.getGameStageName());

                // 解析 peers JSON 字符串
                let peersData: PeerInfo[] | null = null;
                try {
                    peersData = JSON.parse(roomInfo.peers) as PeerInfo[];
                    console.log('Parsed peers data:', peersData);

                    // 验证数据结构
                    if (Array.isArray(peersData)) {
                        peersData.forEach((peer, index) => {
                            if (typeof peer.addr !== 'string' || typeof peer.id !== 'number') {
                                console.warn(`Invalid peer data at index ${index}:`, peer);
                            }
                        });
                    }
                } catch (e) {
                    console.warn('Failed to parse peers JSON:', roomInfo.peers, e);
                    peersData = null;
                }

                // 通过EventBus发送给React层，包含完整的房间信息
                EventBus.emit('room-info', {
                    roomId: roomInfo.roomId,
                    myId: roomInfo.myId,
                    lordId: roomInfo.lordId,
                    peers: roomInfo.peers,
                    peersData: peersData, // 解析后的玩家数据数组
                    playerCount: peersData ? peersData.length : 0 // 玩家数量
                });
                break;
            case 'chooseMap':
                const chooseMap = roomResponse.payload.chooseMap;
                onlineStateManager.updateGameStage(EnumGameStage.Preparing);
                console.log('Map chosen:', chooseMap, 'Stage changed to:', onlineStateManager.getGameStageName());
                // 通过EventBus发送给React层
                EventBus.emit('room-choose-map', chooseMap);
                break;
            case 'quitChooseMap':
                // 退出选卡阶段，回到大厅等待状态
                onlineStateManager.updateGameStage(EnumGameStage.InLobby);
                console.log('Quit choose map, stage changed to:', onlineStateManager.getGameStageName());
                // 通过EventBus发送给React层
                EventBus.emit('room-quit-choose-map');
                break;
            case 'updateReadyCount':
                const updateReadyCount = roomResponse.payload.updateReadyCount;
                console.log('Ready count updated:', updateReadyCount.count, '/', updateReadyCount.allPlayerCount, 'Current stage:', onlineStateManager.getGameStageName());
                // 通过EventBus发送给React层
                EventBus.emit('room-update-ready-count', {
                    readyCount: updateReadyCount.count,
                    totalPlayers: updateReadyCount.allPlayerCount
                });
                break;
            case 'allReady':
                const allReady = roomResponse.payload.allReady;
                onlineStateManager.updateGameStage(EnumGameStage.Loading);
                console.log('All players ready:', allReady, 'Stage changed to:', onlineStateManager.getGameStageName());
                // 通过EventBus发送给React层
                EventBus.emit('room-all-ready', allReady);
                break;
            case 'allLoaded':
                const allLoaded = roomResponse.payload.allLoaded;
                onlineStateManager.updateGameStage(EnumGameStage.InGame);
                console.log('All players loaded, seed:', allLoaded.seed, 'Stage changed to:', onlineStateManager.getGameStageName());
                // 通过EventBus发送给Game层处理游戏开始
                const roomInfo2 = onlineStateManager.getRoomInfo();
                EventBus.emit('room-game-start', { seed: allLoaded.seed, myID: roomInfo2.myId });
                break;
            case 'gameEnd':
                const gameEnd = roomResponse.payload.gameEnd;
                onlineStateManager.updateGameStage(EnumGameStage.PostGame);
                console.log('Game ended:', gameEnd, 'Stage changed to:', onlineStateManager.getGameStageName());
                // 通过EventBus发送给Game层处理游戏结束
                EventBus.emit('room-game-end', { isWin: gameEnd.gameResult === 1 });
                break;
            case 'roomClosed':
                const roomClosed = roomResponse.payload.roomClosed;
                console.log('🔴 Room closed message received:', roomClosed.message);
                console.log('🔴 About to close connection due to roomClosed message');
                onlineStateManager.resetAllState();
                this.ws.closeConnection();
                // 通过EventBus通知React层
                EventBus.emit('room-closed', { message: roomClosed.message });
                break;
            case 'error':
                const error = roomResponse.payload.error;
                console.error('🔴 Room error message received:', error.message);
                // 通过EventBus通知React层
                EventBus.emit('room-error', { message: error.message });
                break;
            default:
                console.warn('Unknown room response type:', roomResponse.payload.oneofKind);
                break;
        }
    }

    public handleInGameResponse(response: Uint8Array) {
        const inGameResponse = InGameResponse.fromBinary(response);
        // console.log('InGame response received, frameId:', inGameResponse.frameId);

        // 通知接收队列处理游戏内响应
        const receiveQueue = this.ws.getReceiveQueue();
        if (receiveQueue) {
            receiveQueue.handleInGameResponse(inGameResponse);
        } else {
            console.warn('Receive queue not available, cannot handle InGame response');
        }
    }
} 