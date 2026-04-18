import Denque from "denque";
import { Game } from "../scenes/Game";
import BackendWS from "../../utils/net/sync";
import {
  PhaserEventBus,
  PhaserEvents,
} from "../EventBus";
import {
  InGameOperation,
  InGameResponse
} from "../../pb/response";
import { EventBus } from "../../utils/eventBus";
import SyncManager from "../managers/combat/SyncManager";

// 单人游戏
interface SingleParams {
  mode: 'single';
}

// 多人联机
interface MultiParams {
  mode: 'multi';
}

type InGameEvent = {
  onCardPlant: (pid: number, col: number, row: number, level: number, uid: number) => void;
  onRemovePlant: (pid: number, col: number, row: number) => void;
  onUseStarShards: (pid: number, col: number, row: number, uid: number) => void;
  onGameEvent: (eventType: number, message: string) => void;
  onError: (message: string) => void;
}

export default class QueueReceive {
  InGameEventBus: EventBus<InGameEvent>;

  // 游戏内的事件队列
  // 游戏外的事件直接消费
  queues: Denque<InGameResponse>;

  lastAckFrameId: number = 0; // 上一个被ack的服务器帧ID


  // frameid_to_process
  // 缓冲区，缓存ack id 以后的操作,回溯使用
  backupOperations: Map<number, InGameOperation[]> = new Map<number, InGameOperation[]>();

  consumedResponseFrames: Set<number> = new Set<number>();

  constructor(params: SingleParams | MultiParams, game: Game) {
    this.queues = new Denque();
    this.backupOperations = new Map();
    this.InGameEventBus = new EventBus<InGameEvent>();
  }

  Reset() {
    this.queues.clear();
    this.backupOperations.clear();
    this.lastAckFrameId = 0;
    this.consumedResponseFrames.clear();
  }

  // 处理游戏内响应
  handleInGameResponse(response: InGameResponse) {
    // 直接将整个InGameResponse放入队列，由Consume方法处理
    this.queues.push(response);
  }

  // 将operation转换为要做的函数
  public ConsumeInGameOperation(operation: InGameOperation): void {
    // 就是本次nextFrameID的操作
    switch (operation.payload.oneofKind) {
      case 'cardPlant':
        const cardPlant = operation.payload.cardPlant;
        if (cardPlant.base) {
          this.InGameEventBus.emit('onCardPlant', cardPlant.pid, cardPlant.base!.col, cardPlant.base!.row, cardPlant.level, cardPlant.base!.uid);
          return;
        }
        break;
      case 'removePlant':
        const removePlant = operation.payload.removePlant;
        if (removePlant.base) {
          this.InGameEventBus.emit('onRemovePlant', removePlant.pid, removePlant.base!.col, removePlant.base!.row);
          return;
        }
        break;
      case 'useStarShards':
        const useStarShards = operation.payload.useStarShards;
        if (useStarShards.base) {
          this.InGameEventBus.emit('onUseStarShards', useStarShards.pid, useStarShards.base!.col, useStarShards.base!.row, useStarShards.base!.uid);
          return;
        }
        break;
      case 'gameEvent':
        // 处理游戏事件 - 暂时跳过，因为Game类没有这个方法
        const gameEvent = operation.payload.gameEvent;
        if (gameEvent) {
          if (gameEvent.eventType === 0x4000) {
            return;
          }
          this.InGameEventBus.emit('onGameEvent', gameEvent.eventType, gameEvent.message);
          console.log('Game event;type=', gameEvent.eventType, ';message=', gameEvent.message);
          return;
        }
        break;
      case 'error':
        const error = operation.payload.error;
        if (error) {
          this.InGameEventBus.emit('onError', error.message);
          console.error('Game error:', error.message);
          return;
        }
        break;
      default:
        console.warn('Unknown game operation type:', operation.payload.oneofKind);
        return;
    }
    console.warn('No operation function defined for:', operation.payload.oneofKind)
    return;
  }


  // 游戏每逻辑帧时机到调用,循环消费直到空
  Consume() {
    // 先获得本次loop后要前进到的帧ID
    // 也即所有的操作都是为了 本帧 到 nextFrameID
    const nextFrameID = BackendWS.GetNextFrameID();

    // 缓存早到的resp
    const cacheResponse: InGameResponse[] = [];

    // 使用回溯，所有frameID > ack Id 的帧都要被消费
    let needBackTrace = false;
    // 最早需要回溯到的帧
    let earliestBackTraceFrameID = Number.MAX_SAFE_INTEGER;

    // 消费游戏接受消息队列
    while (!this.queues.isEmpty()) {
      const response = this.queues.shift();
      if (!response) continue;
      // 不接受落后ack ID的帧
      if (response.frameId <= this.lastAckFrameId) {
        console.warn('Received response with frameId less than or equal to lastAckFrameId:', response.frameId, 'lastAckFrameId:', this.lastAckFrameId);
        continue;
      }

      if (response.frameId > nextFrameID) {
        // 早到的帧，缓存起来
        cacheResponse.push(response);
        continue;
      }

      // 已经消费过的帧
      if (this.consumedResponseFrames.has(response.frameId)) {
        console.warn('Received response with frameId that has already been consumed:', response.frameId);
        continue;
      }

      this.consumedResponseFrames.add(response.frameId);

      // 加入缓冲区
      for (const operation of response.operations) {
        if (operation.processFrameId <= this.lastAckFrameId) {
          console.warn('Received operation with processFrameId less than or equal to lastAckFrameId:', operation.processFrameId, 'lastAckFrameId:', this.lastAckFrameId);
          continue;
        }

        if (operation.processFrameId < nextFrameID) {
          // 之前的帧，回溯
          needBackTrace = true;
          earliestBackTraceFrameID = Math.min(earliestBackTraceFrameID, operation.processFrameId);
        }

        const newFrameList = this.backupOperations.get(operation.processFrameId) || [];
        newFrameList.push(operation);
        this.backupOperations.set(operation.processFrameId, newFrameList);
      }

      // TODO: 移除 onlineStateManager 这个之前的依赖
      BackendWS.AckFrameID = response.frameId;
    }

    // 缓存重新放入队列
    for (const resp of cacheResponse) {
      this.queues.unshift(resp);
    }

    if (needBackTrace) {
      SyncManager.Instance.BacktrackToFrame(earliestBackTraceFrameID);
      return;
    }

    // 此次有效不需要回溯
    const operations = this.backupOperations.get(nextFrameID) || [];

    // 执行
    for (const operation of operations) {
      this.ConsumeInGameOperation(operation);
    }


    // 发送确认信息 - 使用新的protobuf结构
    BackendWS.sendBlankFrame(nextFrameID);
    BackendWS.GoToFrameID(nextFrameID);

    // FUTURE： 不需要再手动维护事件顺序了，因为未来会使用各种cmd主动进行lateUpdate

  }
} 