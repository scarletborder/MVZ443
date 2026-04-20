import { WebSocketClient } from "./sync";
import {
  InGameResponse,
  LobbyResponse,
  RoomResponse,
} from "../../pb/response";
import EnumGameStage from "./game_state";
import {
  PhaserEventBus,
  PhaserEvents,
} from "../../game/EventBus";
import { onlineStateManager } from "../../store/OnlineStateManager";
import { PeerInfo, RoomAllReadyEvent } from "../../types/online";

export default class WSClientHandlers {
  private ws: WebSocketClient;

  constructor(ws: WebSocketClient) {
    this.ws = ws;
  }

  public handleLobbyResponse(response: Uint8Array) {
    const lobbyResponse = LobbyResponse.fromBinary(response);

    switch (lobbyResponse.payload.oneofKind) {
      case 'joinRoomFailed':
        onlineStateManager.updateOnlineMode(false);
        onlineStateManager.resetAllState();
        console.error('Join room failed:', lobbyResponse.payload.joinRoomFailed.message);
        alert(lobbyResponse.payload.joinRoomFailed.message);
        this.ws.closeConnection();
        break;
      case 'joinRoomSuccess': {
        const joinRoomSuccess = lobbyResponse.payload.joinRoomSuccess;
        console.log('joinRoomSuccess message received:', joinRoomSuccess);

        onlineStateManager.updateOnlineMode(true);
        onlineStateManager.updateGameStage(EnumGameStage.InLobby);
        onlineStateManager.updateRoomInfo(joinRoomSuccess.roomId, joinRoomSuccess.myId, 50);
        onlineStateManager.updateConnectionKey(joinRoomSuccess.key);

        PhaserEventBus.emit(PhaserEvents.LobbyJoinSuccess, {
          roomId: joinRoomSuccess.roomId,
          myId: joinRoomSuccess.myId,
          key: joinRoomSuccess.key,
          message: joinRoomSuccess.message
        });
        break;
      }
      default:
        console.error("Unknown lobby response type:", lobbyResponse.payload.oneofKind);
        break;
    }
  }

  public handleRoomResponse(response: Uint8Array) {
    const roomResponse = RoomResponse.fromBinary(response);

    switch (roomResponse.payload.oneofKind) {
      case 'roomInfo': {
        const roomInfo = roomResponse.payload.roomInfo;
        onlineStateManager.updateRoomInfo(roomInfo.roomId, roomInfo.myId, roomInfo.lordId, roomInfo.peers);

        let peersData: PeerInfo[] | null = null;
        try {
          peersData = JSON.parse(roomInfo.peers) as PeerInfo[];
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

        PhaserEventBus.emit(PhaserEvents.RoomInfo, {
          roomId: roomInfo.roomId,
          myId: roomInfo.myId,
          lordId: roomInfo.lordId,
          peers: roomInfo.peers,
          peersData,
          playerCount: peersData ? peersData.length : 0
        });
        break;
      }
      case 'chooseMap': {
        const chooseMap = roomResponse.payload.chooseMap;
        onlineStateManager.updateGameStage(EnumGameStage.Preparing);
        PhaserEventBus.emit(PhaserEvents.RoomChooseMap, chooseMap);
        break;
      }
      case 'quitChooseMap':
        onlineStateManager.updateGameStage(EnumGameStage.InLobby);
        PhaserEventBus.emit(PhaserEvents.RoomQuitChooseMap);
        break;
      case 'updateReadyCount': {
        const updateReadyCount = roomResponse.payload.updateReadyCount;
        PhaserEventBus.emit(PhaserEvents.RoomUpdateReadyCount, {
          readyCount: updateReadyCount.count,
          totalPlayers: updateReadyCount.allPlayerCount
        });
        break;
      }
      case 'allReady': {
        const allReady = roomResponse.payload.allReady;
        const allReadyEvent: RoomAllReadyEvent = {
          allPlayerCount: allReady.allPlayerCount,
          seed: allReady.seed,
          myId: allReady.myId,
          playerIds: allReady.playerIds
        };
        onlineStateManager.updateRoomAllReady(allReadyEvent);
        onlineStateManager.updateGameStage(EnumGameStage.Loading);
        PhaserEventBus.emit(PhaserEvents.RoomAllReady, allReadyEvent);
        break;
      }
      case 'allLoaded': {
        onlineStateManager.updateGameStage(EnumGameStage.InGame);
        const roomInfo = onlineStateManager.getRoomInfo();
        PhaserEventBus.emit(PhaserEvents.RoomGameStart, { myID: roomInfo.myId });
        break;
      }
      case 'gameEnd': {
        const gameEnd = roomResponse.payload.gameEnd;
        onlineStateManager.updateGameStage(EnumGameStage.PostGame);
        PhaserEventBus.emit(PhaserEvents.RoomGameEnd, { isWin: gameEnd.gameResult === 1 });
        break;
      }
      case 'roomClosed': {
        const roomClosed = roomResponse.payload.roomClosed;
        onlineStateManager.resetAllState();
        this.ws.closeConnection();
        PhaserEventBus.emit(PhaserEvents.RoomClosed, { message: roomClosed.message });
        break;
      }
      case 'error': {
        const error = roomResponse.payload.error;
        PhaserEventBus.emit(PhaserEvents.RoomError, { message: error.message });
        break;
      }
      default:
        console.warn('Unknown room response type:', roomResponse.payload.oneofKind);
        break;
    }
  }

  public handleInGameResponse(response: Uint8Array) {
    const inGameResponse = InGameResponse.fromBinary(response);
    console.log("[WSClientHandlers] handleInGameResponse", {
      frameId: inGameResponse.frameId,
      operationCount: inGameResponse.operations.length,
      hasReceiveQueue: Boolean(this.ws.getReceiveQueue())
    });
    const receiveQueue = this.ws.getReceiveQueue();
    if (receiveQueue) {
      receiveQueue.handleInGameResponse(inGameResponse);
    } else {
      this.ws.enqueuePendingInGameResponse(inGameResponse);
    }
  }
}
