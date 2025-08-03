import { WebSocketClient } from "./sync";
import {
    InGameResponse,
    LobbyResponse,
    RoomResponse,
} from "../../pb/response";
import EnumGameStage from "./game_state";
import { EventBus } from "../../game/EventBus";
import { onlineStateManager } from "../../store/OnlineStateManager";

export default class WSClientHandlers {
    private ws: WebSocketClient;

    constructor(ws: WebSocketClient) {
        this.ws = ws;
    }

    public handleLobbyResponse(response: Uint8Array) {
        const lobbyResponse = LobbyResponse.fromBinary(response);
        onlineStateManager.updateGameStage(EnumGameStage.InLobby);

        switch (lobbyResponse.payload.oneofKind) {
            case 'joinRoomFailed':
                onlineStateManager.updateOnlineMode(false);
                onlineStateManager.updateRoomInfo(-1, 51, 50);
                this.ws.closeConnection();
                alert(lobbyResponse.payload.joinRoomFailed.message);
                break;
            case 'joinRoomSuccess':
                const joinRoomSuccess = lobbyResponse.payload.joinRoomSuccess;
                onlineStateManager.updateOnlineMode(true);
                onlineStateManager.updateRoomInfo(joinRoomSuccess.roomId, joinRoomSuccess.myId, 50);
                onlineStateManager.updateConnectionKey(joinRoomSuccess.key);
                const keyText = joinRoomSuccess.key === "" ? "公开" : `密钥=${joinRoomSuccess.key}`;
                alert(`连接成功, 房间号=${joinRoomSuccess.roomId} ${keyText}`);
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
                onlineStateManager.updateRoomInfo(roomInfo.roomId, roomInfo.myId, roomInfo.lordId);
                console.log('Room info received:', roomInfo);
                // 通过EventBus发送给React层
                EventBus.emit('room-info', roomInfo);
                break;
            case 'chooseMap':
                const chooseMap = roomResponse.payload.chooseMap;
                onlineStateManager.updateGameStage(EnumGameStage.Preparing);
                console.log('Map chosen:', chooseMap);
                // 通过EventBus发送给React层
                EventBus.emit('room-choose-map', chooseMap);
                break;
            case 'allReady':
                const allReady = roomResponse.payload.allReady;
                console.log('All players ready:', allReady);
                // 通过EventBus发送给React层
                EventBus.emit('room-all-ready', allReady);
                break;
            case 'allLoaded':
                const allLoaded = roomResponse.payload.allLoaded;
                onlineStateManager.updateGameStage(EnumGameStage.InGame);
                console.log('All players loaded, seed:', allLoaded.seed);
                // 通过EventBus发送给Game层处理游戏开始
                const roomInfo2 = onlineStateManager.getRoomInfo();
                EventBus.emit('room-game-start', { seed: allLoaded.seed, myID: roomInfo2.myId });
                break;
            case 'gameEnd':
                const gameEnd = roomResponse.payload.gameEnd;
                onlineStateManager.updateGameStage(EnumGameStage.PostGame);
                console.log('Game ended:', gameEnd);
                // 通过EventBus发送给Game层处理游戏结束
                EventBus.emit('room-game-end', { isWin: gameEnd.gameResult === 1 });
                break;
            case 'roomClosed':
                const roomClosed = roomResponse.payload.roomClosed;
                console.log('Room closed:', roomClosed.message);
                onlineStateManager.resetAllState();
                this.ws.closeConnection();
                // 通过EventBus通知React层
                EventBus.emit('room-closed', { message: roomClosed.message });
                break;
            case 'error':
                const error = roomResponse.payload.error;
                console.error('Room error:', error.message);
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
        console.log('InGame response received, frameId:', inGameResponse.frameId);

        // 通知接收队列处理游戏内响应
        const receiveQueue3 = this.ws.getReceiveQueue();
        if (receiveQueue3) {
            receiveQueue3.handleInGameResponse(inGameResponse);
        }
    }
} 