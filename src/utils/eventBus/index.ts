/**
 * 定义事件类型的基本约束：键为字符串/数字/符号，值为函数
 */
type EventType = Record<string | number | symbol, (...args: any[]) => any>;

/**
 * 默认空类型
 */
type VoidType = Record<never, never>;

export class EventBus<Event extends EventType = VoidType> {
  // 初始化成员变量，对应声明文件中的 protected
  protected eventMap: Map<keyof Event, Array<Event[keyof Event]>> = new Map();

  constructor() { }

  /**
   * 实例化一个全新的事件总线
   */
  newInstance<T extends EventType = VoidType>(): EventBus<T> {
    return new EventBus<T>();
  }

  /**
   * 拓展当前事件总线的类型定义
   * 注意：这在运行时只是返回 self，但在编译时会赋予新的泛型类型
   */
  extend<T extends EventType>(): EventBus<Event & T> {
    return this as unknown as EventBus<Event & T>;
  }

  /**
   * 开始监听事件
   * @returns 返回一个取消监听的函数
   */
  on<T extends keyof Event>(eventName: T, callback: Event[T]): () => void {
    if (!this.eventMap.has(eventName)) {
      this.eventMap.set(eventName, []);
    }

    const handlers = this.eventMap.get(eventName)!;
    handlers.push(callback);

    return () => {
      const eventHandlers = this.eventMap.get(eventName);
      if (!eventHandlers) return;
      const index = eventHandlers.indexOf(callback);
      if (index !== -1) {
        eventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * 触发事件
   * @returns 返回所有执行回调后的结果数组
   */
  emit<T extends keyof Event>(eventName: T, ...args: Parameters<Event[T]>): ReturnType<Event[T]>[] {
    const result: ReturnType<Event[T]>[] = [];
    const handlers = this.eventMap.get(eventName);

    if (handlers) {
      // 使用 slice(0) 浅拷贝一份数组，防止在回调执行过程中修改原数组导致索引错乱
      for (const callback of handlers.slice(0)) {
        result.push((callback as any)(...args));
      }
    }
    return result;
  }

  /**
   * 停止事件监听
   * 1. 不传 eventName 则停止所有事件的监听
   * 2. 不传 callback 则停止该事件名下的所有监听
   * 3. 传了 eventName 和 callback 则停止该特定监听
   */
  off<T extends keyof Event>(eventName?: T, callback?: Event[T]): void {
    // 1. 什么都不传，清空所有
    if (eventName === undefined) {
      this.eventMap.clear();
      return;
    }

    // 2. 传了事件名，没传回调，删除该事件名下的所有监听
    if (callback === undefined) {
      this.eventMap.delete(eventName);
    }
    // 3. 传了事件名和具体回调
    else {
      const handlers = this.eventMap.get(eventName);
      if (handlers) {
        const index = handlers.indexOf(callback);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }

  /**
   * 停止所有事件的全部监听
   */
  removeAllListeners(): void {
    this.eventMap.clear();
  }

  /**
   * 获取当前所有已注册的事件名
   */
  keys(): Array<keyof Event> {
    return Array.from(this.eventMap.keys());
  }
}

export default EventBus;