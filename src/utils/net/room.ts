// Request sender for room lifecycle operations.
import { Request, RequestChooseMap, RequestEndGame, RequestLeaveChooseMap, RequestLoaded, RequestReady } from "../../pb/request";
import BackendWS from "./sync";

function SendChooseMap(chapterId: number, stageId: number) {
  if (!BackendWS.isRoomSessionMode() || !BackendWS.isLord()) {
    return;
  }

  const request: RequestChooseMap = {
    chapterId,
    stageId
  };
  BackendWS.send(Request.toBinary({ payload: { chooseMap: request, oneofKind: 'chooseMap' } }));
}

function SendLeaveChooseMap() {
  const request: RequestLeaveChooseMap = {};
  BackendWS.send(Request.toBinary({ payload: { leaveChooseMap: request, oneofKind: 'leaveChooseMap' } }));
}

function SendReady(isReady: boolean) {
  const request: RequestReady = {
    isReady
  };
  BackendWS.send(Request.toBinary({ payload: { ready: request, oneofKind: 'ready' } }));
}

function SendLoaded(isLoaded: boolean = true) {
  if (!isLoaded) {
    return;
  }

  if (!BackendWS.isRoomSessionMode()) {
    console.error("SendLoaded requires an active room session. Single-player must use the mock room flow.");
    return;
  }

  const request: RequestLoaded = {
    isLoaded: true
  };
  BackendWS.send(Request.toBinary({ payload: { loaded: request, oneofKind: 'loaded' } }));
}

function SendEndGame(isWin: boolean) {
  const request: RequestEndGame = {
    gameResult: isWin ? 1 : 0
  };
  BackendWS.send(Request.toBinary({ payload: { endGame: request, oneofKind: 'endGame' } }));
}

export { SendChooseMap, SendLeaveChooseMap, SendReady, SendLoaded, SendEndGame };
