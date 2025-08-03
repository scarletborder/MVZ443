import Denque from "denque";
import BackendWS from "../../utils/net/sync";
import { gameStateManager } from "../../store/GameStateManager";
import PlantFactoryMap from "../presets/plant";
import {
  RequestBlank,
  RequestCardPlant,
  RequestRemovePlant,
  RequestStarShards,
  RequestReady,
  RequestLoaded,
  RequestEndGame,
  RequestChooseMap,
  RequestGridOperation,
  Request
} from "../../pb/request";
import { EventBus } from "../EventBus";
import { InGameOperation, InGameResponse, ResponseGridOperation } from "../../pb/response";

// 单人游戏
interface SingleParams {
  mode: 'single';
  recvQueue: Denque; // 单人游戏中先初始化接收队列
}

// 多人联机
interface MultiParams {
  mode: 'multi';
}

export default class QueueSend {
  queues: Denque<Request>;
  singRecvQueue: Denque<InGameResponse> | null = null; // 仅singlePlayer,接收队列
  myID: number = 0;

  // 仅单机有用
  // 下一帧已经有了多少操作， 用于生成sequence
  public operationCount: number = 1;

  constructor(params: SingleParams | MultiParams) {
    this.queues = new Denque();
    if (params.mode === 'single') {
      this.singRecvQueue = params.recvQueue;
    } else {
      // 多人
      this.singRecvQueue = null;
    }
  }

  // 立即的方法,设置本myId
  setMyID(myID: number) {
    this.myID = myID;
  }

  Consume() {
    // 如果是单人游戏,直接返回
    if (!BackendWS.isOnlineMode) return;
    else {
      // 多人游戏
      // 直接发送数据到服务器
      BackendWS.consumeSendQueue();
    }
  }

  // 单人模式下，只有在需要使用接受队列前，才会一次性把数据放入接收队列
  // 这里模拟的是服务端的handle->广播的逻辑
  _extractBase(base?: RequestGridOperation): ResponseGridOperation | undefined {
    if (!base) return undefined;
    return {
      uid: BackendWS.my_id,
      col: base.col,
      row: base.row
    };
  };

  public DispatchSingleModeQueue() {
    if (!this.singRecvQueue) {
      console.error('singRecvQueue is null');
      return;
    }
    const nextFrameID = BackendWS.GetNextFrameID(); // 下一渲染的帧
    this.operationCount = 1; // 重置操作计数
    const operations: InGameOperation[] = [];

    while (!this.queues.isEmpty()) {
      const data = this.queues.shift();
      if (!data) continue;
      // send queue 应该只会发送InGame的消息
      // 其他消息通过其他地方（比如room.ts或内嵌的send发送）
      if (!this.singRecvQueue) {
        console.error('singRecvQueue is null');
        return;
      }
      this.operationCount++; // 增加操作计数
      switch (data.payload.oneofKind) {
        case 'blank':
          // 单人游戏开始发空帧由game.load函数结束后调用
          operations.push({
            processFrameId: data.payload.blank.frameId + 1,
            operationIndex: this.operationCount,
            payload: {
              gameEvent: {
                eventType: 0x4000, // 空白帧
                message: ''
              },
              oneofKind: 'gameEvent'
            }
          })
          break;
        case 'plant':
          operations.push({
            processFrameId: Math.max(data.payload.plant.base?.processFrameId || 0, nextFrameID),
            operationIndex: this.operationCount,
            payload: {
              cardPlant: {
                pid: data.payload.plant.pid,
                level: data.payload.plant.level,
                cost: data.payload.plant.cost,
                base: this._extractBase(data.payload.plant.base),
              },
              oneofKind: 'cardPlant'
            }
          });
          break;
        case 'removePlant':
          operations.push({
            processFrameId: Math.max(data.payload.removePlant.base?.processFrameId || 0, nextFrameID),
            operationIndex: this.operationCount,
            payload: {
              removePlant: {
                base: this._extractBase(data.payload.removePlant.base),
                pid: data.payload.removePlant.pid,
              },
              oneofKind: 'removePlant'
            }
          })
          break;
        case 'starShards':
          operations.push({
            processFrameId: Math.max(data.payload.starShards.base?.processFrameId || 0, nextFrameID),
            operationIndex: this.operationCount,
            payload: {
              useStarShards: {
                base: this._extractBase(data.payload.starShards.base),
                pid: data.payload.starShards.pid,
                cost: data.payload.starShards.cost,
              },
              oneofKind: 'useStarShards'
            }
          })
          break;
        default:
          break;
      }
    }
    this.singRecvQueue.push({
      frameId: nextFrameID,
      operations: operations,
    });
  }

  // Onlinemode发送消息
  // Deprecated 的东西放到 utils/net/room.ts 中

  /**
   * Deprecated: 应该在react组件中进行发送， 而不是这里
   * 发送游戏结束的信息,该信息具有最高的等级,无视frameID(因为处理队列会处理最先传来的数据)
   * @param result 0-失败, 1-胜利
   */
  public sendGameEnd(result: number) {
    const request: RequestEndGame = {
      gameResult: result
    };
    this.queues.push({
      payload: {
        endGame: request,
        oneofKind: 'endGame'
      }
    });
  }

  // 根据ack和frameId， 计算最佳的processFrameId
  // 减少预测失败的可能
  public EstimateProcessFrameId(base: RequestGridOperation) {
    // 上一次的服务器帧
    const ackFrameId = BackendWS.AckFrameID;

  }

  public sendCardPlant(pid: number, col: number, row: number, level: number) {
    const base: RequestGridOperation = {
      col: col,
      row: row,
      processFrameId: BackendWS.GetFrameID() + BackendWS.calculateServerFrameDiff()
    };

    // 从PlantFactoryMap获取实际消耗
    const plantRecord = PlantFactoryMap[pid];
    const cost = plantRecord ? plantRecord.cost(level) : 0;

    const request: RequestCardPlant = {
      base: base,
      pid: pid,
      level: level,
      cost: cost,
      energySum: gameStateManager.getCurrentEnergy(),
      starShardsSum: gameStateManager.getCurrentStarShards()
    };
    this.queues.push({
      payload: {
        plant: request,
        oneofKind: 'plant'
      }
    });
  }

  public sendRemovePlant(pid: number, col: number, row: number) {
    const base: RequestGridOperation = {
      col: col,
      row: row,
      processFrameId: BackendWS.GetFrameID() + BackendWS.calculateServerFrameDiff()
    };

    const request: RequestRemovePlant = {
      base: base,
      pid: pid
    };
    this.queues.push({
      payload: {
        removePlant: request,
        oneofKind: 'removePlant'
      }
    });
  }

  public sendStarShards(pid: number, col: number, row: number) {
    const base: RequestGridOperation = {
      col: col,
      row: row,
      processFrameId: BackendWS.GetFrameID() + BackendWS.calculateServerFrameDiff()
    };

    const currentStarShards = gameStateManager.getCurrentStarShards();
    let cost = 1;
    if (BackendWS.isOnlineMode) {
      if (currentStarShards > 1) {
        cost = 2;
      }
    }

    const request: RequestStarShards = {
      base: base,
      pid: pid,
      cost: cost,
      energySum: gameStateManager.getCurrentEnergy(),
      starShardsSum: currentStarShards
    };
    this.queues.push({
      payload: {
        starShards: request,
        oneofKind: 'starShards'
      }
    });
  }

  public sendBlankFrame(frameId: number) {
    const request: RequestBlank = {
      frameId: frameId,
      ackFrameId: BackendWS.AckFrameID
    };
    this.queues.push({
      payload: {
        blank: request,
        oneofKind: 'blank'
      }
    });
  }
}