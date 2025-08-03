// Request Sender
// 关于选关，准备，结束游戏等发送消息的操作
/**
 * RequestChooseMap choose_map = 6;
 * RequestLeaveChooseMap leave_choose_map = 9;
 * 
 * RequestReady ready = 5;
 * RequestLoaded loaded = 8;
 * RequestEndGame end_game = 7;
 */
import { EventBus } from "../../game/EventBus";
import { Request, RequestChooseMap, RequestEndGame, RequestLeaveChooseMap, RequestLoaded, RequestReady } from "../../pb/request";
import BackendWS from "./sync";

function SendChooseMap(chapterId: number, stageId: number) {
    // 只在多人游戏中发送ChooseMap消息，且只有房主可以发送
    if (!BackendWS.isOnlineMode || !BackendWS.isLord()) {
        return;
    }
    const request: RequestChooseMap = {
        chapterId: chapterId,
        stageId: stageId
    };
    BackendWS.send(Request.toBinary({ payload: { chooseMap: request, oneofKind: 'chooseMap' } }));
}

function SendLeaveChooseMap() {
    const request: RequestLeaveChooseMap = {};
    BackendWS.send(Request.toBinary({ payload: { leaveChooseMap: request, oneofKind: 'leaveChooseMap' } }));
}

function SendReady(isReady: boolean) {
    const request: RequestReady = {
        isReady: isReady
    }
    BackendWS.send(Request.toBinary({ payload: { ready: request, oneofKind: 'ready' } }));
}

function SendLoaded(isLoaded: boolean = true) {
    if (!isLoaded) {
        return;
    }
    // 只在多人游戏中发送Loaded消息
    if (!BackendWS.isOnlineMode) {
        // 单人游戏直接开始
        EventBus.emit('room-game-start', { seed: Math.random(), myID: BackendWS.my_id }); // 单人
        return;
    } else {
        // 发送服务端应该在 Stage_Loading 等待的消息， 让服务端知道本客户端已经加载
        const request: RequestLoaded = {
            isLoaded: true
        };
        BackendWS.send(Request.toBinary({ payload: { loaded: request, oneofKind: 'loaded' } }));
    }
}

function SendEndGame(isWin: boolean) {
    const request: RequestEndGame = {
        gameResult: isWin ? 1 : 0
    }
    BackendWS.send(Request.toBinary({ payload: { endGame: request, oneofKind: 'endGame' } }));
}

export { SendChooseMap, SendLeaveChooseMap, SendReady, SendLoaded, SendEndGame };