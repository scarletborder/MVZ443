import Denque from "denque";
import { Game } from "../scenes/Game";
import BackendWS from "../../utils/net/sync";
import { EventBus } from "../EventBus";
import {
  InGameOperation,
  InGameResponse
} from "../../pb/response";

// 单人游戏
interface SingleParams {
  mode: 'single';
}

// 多人联机
interface MultiParams {
  mode: 'multi';
}

export default class QueueReceive {
  game: Game;

  queues: Denque<InGameResponse>;

  // frameid_to_process
  // 过去的服务器response中存放的未来才会处理的操作
  laterOperations: Map<number, InGameOperation[]> = new Map<number, InGameOperation[]>();

  myID: number = 0;
  seed: number = 0;

  // 多人游戏专用属性
  isHalted: boolean = false; // 是否halt 了game, 由于没有及时接收到下一个服务器帧

  constructor(params: SingleParams | MultiParams, game: Game) {
    this.game = game;
    this.queues = new Denque();
    this.laterOperations = new Map();

    if (params.mode === 'single') {
      // 单人游戏模拟直接向 recv_queue 发一次 InGameResponse.game_event,
      // 帧号是服务器要让客户端前进到的帧号，即 1

    }
  }

  // 处理游戏内响应
  handleInGameResponse(response: InGameResponse) {
    // 直接将整个InGameResponse放入队列，由Consume方法处理
    this.queues.push(response);
  }

  // 将operation转换为要做的函数
  private _operationToFunction(operation: InGameOperation): (() => void) {
    // 就是本次nextFrameID的操作
    switch (operation.payload.oneofKind) {
      case 'cardPlant':
        const cardPlant = operation.payload.cardPlant;
        if (cardPlant.base) {
          return () => {
            this._cardPlant(cardPlant.pid, cardPlant.base!.col, cardPlant.base!.row, cardPlant.level, cardPlant.base!.uid);
          };
        }
        break;
      case 'removePlant':
        const removePlant = operation.payload.removePlant;
        if (removePlant.base) {
          return () => {
            this._removePlant(removePlant.pid, removePlant.base!.col, removePlant.base!.row);
          };
        }
        break;
      case 'useStarShards':
        const useStarShards = operation.payload.useStarShards;
        if (useStarShards.base) {
          return () => {
            this._useStarShards(useStarShards.pid, useStarShards.base!.col, useStarShards.base!.row, useStarShards.base!.uid);
          };
        }
        break;
      case 'gameEvent':
        // 处理游戏事件 - 暂时跳过，因为Game类没有这个方法
        const gameEvent = operation.payload.gameEvent;
        if (gameEvent) {
          if (gameEvent.eventType === 0x4000) {
            return () => { };
          }
          return () => console.log('Game event;type=', gameEvent.eventType, ';message=', gameEvent.message);
        }
        break;
      case 'error':
        const error = operation.payload.error;
        if (error) {
          return () => console.error('Game error:', error.message);
        }
        break;
      default:
        return () => console.warn('Unknown game operation type:', operation.payload.oneofKind);
    }
    return () => console.warn('No operation function defined for:', operation.payload.oneofKind);
  }


  // 游戏每逻辑帧时机到调用,循环消费直到空
  Consume() {
    // 单人模式先消费一次发送队列
    if (!BackendWS.isOnlineMode) {
      this.game.sendQueue.DispatchSingleModeQueue();
    }

    const executedList: (() => void)[] = [];

    // 先获得本次loop后要前进到的帧ID
    // 也即所有的操作都是为了 本帧 到 nextFrameID
    const nextFrameID = BackendWS.GetNextFrameID();

    // 这里也存放这服务器返回的response
    // 但是他们的FrameID 都大于 nextFrameID
    // 这一次循环绝对不会采纳他们， 因为process_frame_id 肯定都会大于nextFrameID
    // 结束后会加回接受队列
    const tmpLeftFrames: InGameResponse[] = [];

    // 为了完成这次跨越，需要做的操作们
    // 默认值从laterOperations中获取
    const operations = this.laterOperations.get(nextFrameID) || [];

    // 此轮逻辑帧是否执行了，
    // 服务器会向本接受队列发送 InGameResponse
    // InGameResponse.FrameID 是服务器需要让所有客户端跨越到的下一帧ID
    // 如果在消费接受队列时没有发现等同于nextFrameID的消息
    // 那么halt
    let hasGetThisFrame = false;

    // 消费游戏接受消息队列
    while (!this.queues.isEmpty()) {
      const response = this.queues.shift();
      if (!response) continue;

      // 检查帧ID
      if (response.frameId > nextFrameID) {
        // 此次循环绝对不会用的
        // 稍后他们会回到接受队列
        tmpLeftFrames.push(response);
        continue;
      }

      if (response.frameId < nextFrameID) {
        continue;
      }

      if (response.frameId === 1) {
        // TODO: 移动到 onAllLoaded 事件中
        this.game.handleGameFrameStart(); // 刷怪开始
      }

      // 太好了！这是消息队列中本次nextFrameID的Response
      hasGetThisFrame = true;

      // 处理响应中的所有操作
      for (const operation of response.operations) {
        // 虽然是本frame的response
        // 但是未来才需要做的
        if (operation.processFrameId > nextFrameID) {
          // 未来的操作，存入laterOperations
          if (!this.laterOperations.has(operation.processFrameId)) {
            this.laterOperations.set(operation.processFrameId, []);
          }
          this.laterOperations.get(operation.processFrameId)?.push(operation);
          continue;
        }

        // 一个几乎不可能的情况， prcessFrameId 小于 nextFrameID
        if (operation.processFrameId < nextFrameID) {
          console.warn('Received operation with processFrameId less than nextFrameID:', operation);
          continue;
        }

        operations.push(operation);
      }
    }

    if (tmpLeftFrames.length > 0) {
      // 将未来的帧数据重新放回队列
      for (const frame of tmpLeftFrames) {
        this.queues.push(frame);
      }
    }

    if (!hasGetThisFrame) {
      // 如果本次没有接收到 下一个服务器帧没有接收到服务器的命令,那么暂停游戏,等待下一次服务器帧再次判断
      this._haltGame();
    } else {
      // 此次有效
      // 排序operations
      // processFrameId 小的在前
      operations.sort((a, b) => a.processFrameId - b.processFrameId);
      // 执行
      for (const operation of operations) {
        const func = this._operationToFunction(operation);
        if (func) {
          executedList.push(func);
        }
      }

      // 清空本frameid的laterOperations
      this.laterOperations.delete(nextFrameID);

      // 收到了 下一个服务器帧的命令,自增frameID,发送确认接收信息
      if (BackendWS.isOnlineMode) {
        // 发送确认信息 - 使用新的protobuf结构
        BackendWS.sendBlankFrame(nextFrameID);
        BackendWS.GoToFrameID(nextFrameID);
      } else {
        // 单人游戏
        // 如果游戏没有暂停
        if (!this.game.time.paused) {
          BackendWS.GoToFrameID(nextFrameID);
          // 单人游戏响应到了模拟服务器的发送
          // send blank frame
          this.game.sendQueue.sendBlankFrame(nextFrameID);
        } else {
          // 如果游戏暂停了,那么不需要模拟发送blank
          // 也不能让自己frameID自增,因为有私密图纸

          // 如果有私密图纸，那么这里允许所有的操作
          if (this.game.innerSettings.isBluePrint === true) {
            executedList.forEach((func) => { func(); });
          }
          return;
        }
      }

      this._resumeGame();
      // 该帧有效,帧驱动一些事件发生
      this.game.physics.world.update(this.game.frameTicker.getCurrentTime(), this.game.frameTicker.frameInterval);
      // 例如 plant发出子弹, 刷怪, 避免通过game.timer导致不精确
      this.game.frameTicker.update(); // 游戏中，非暂停，驱动定时器前进1帧
      EventBus.emit('timeFlow-set', { delta: this.game.frameTicker.frameInterval });
      executedList.forEach((func) => { func(); });
    }
  }

  private _cardPlant(pid: number, col: number, row: number, level: number, uid: number) {
    this.game.handleCardPlant(pid, level, col, row, uid);
  }

  private _removePlant(pid: number, col: number, row: number) {
    this.game.handleRemovePlant(pid, col, row);
  }

  private _useStarShards(pid: number, col: number, row: number, uid: number) {
    this.game.handleStarShards(pid, col, row, uid);
  }

  // 由于接收不到服务器的命令,游戏暂停
  private _haltGame() {
    this.isHalted = true;
    this.game.doHalt();
  }

  private _resumeGame() {
    if (!this.isHalted) return;
    // 如果游戏因为没有接收到服务器的命令而暂停,那么恢复游戏
    // 现在只可能是多人游戏,因为单人游戏保证了queue必定有NextFrameID
    this.game.doResume();
    this.isHalted = false;
  }
}