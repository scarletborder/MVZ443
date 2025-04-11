// game中掌管时间的神
import { FrameTick } from "../../../public/constants";

// 定时器基础类，可用作对外接口
export class FrameTimer {
    ticker: FrameTicker; // 定时器所属的 FrameTicker 实例
    public id: number = 0;        // 定时器唯一ID

    public targetFrame: number = 0; // 目标帧数（到达此帧时执行回调）
    public callback: (...args: any[]) => void;  // 定时回调函数
    public args: any[];                // 参数数组
    public context: any;               // 执行回调时的上下文
    public repeat: number;             // 重复次数：0表示一次性，正数表示剩余重复次数，-1表示无限重复
    public interval: number;           // 循环定时任务的帧间隔

    constructor(options: {
        id: number;
        targetFrame: number;
        callback: (...args: any[]) => void;
        args: any[];
        context: any;
        repeat: number;
        interval: number;
        ticker: FrameTicker; // 绑定当前的 FrameTicker 实例
    }) {
        this.id = options.id;
        this.targetFrame = options.targetFrame;
        this.callback = options.callback;
        this.args = options.args;
        this.context = options.context;
        this.repeat = options.repeat;
        this.interval = options.interval;
        this.ticker = options.ticker; // 绑定当前的 FrameTicker 实例
    }
    // 计算剩余时间(frame)
    public GetLeftTimeByFrame(): number {
        return this.targetFrame - this.ticker.currentFrame;
    }

    // 计算剩余时间（毫秒）
    public GetLeftTimeByMs(): number {
        return this.GetLeftTimeByFrame() * FrameTick;
    }

    public remove(): void {
        // 从 FrameTicker 中注销定时器
        this.ticker.Unregister(this);
    }
}

export type DelayedCallConfigType = {
    callback: (...args: any[]) => void;
    delay: number;
    args?: any[];
    context?: any;
};

class DelayedCallConfig {
    callback: (...args: any[]) => void;
    delay: number;
    args: any[];
    context: any;

    constructor(options: DelayedCallConfigType) {
        this.callback = options.callback;
        this.delay = options.delay;
        this.args = options.args ?? [];
        this.context = options.context ?? null;
    }
}

type AddEventConfigType = {
    callback: (...args: any[]) => void;
    delay: number;
    args?: any[];
    context?: any;
    repeat?: number;
    startAt?: number;
    loop?: boolean; // 是否循环
}

export class AddEventConfig {
    callback: (...args: any[]) => void;
    delay: number;
    args: any[];
    context: any;
    repeat: number;
    startAt: number;

    constructor(options: AddEventConfigType) {
        // 必填属性直接赋值，不存在可以抛异常
        this.callback = options.callback;
        this.delay = options.delay;
        // 可选属性使用 ?? 运算符来提供默认值
        this.args = options.args ?? [];
        this.context = options.context ?? null;
        this.repeat = options.repeat ?? -1;
        this.startAt = options.startAt ?? 0;

        if (options.loop && options.loop === true) {
            // 如果是循环定时器，则将 repeat 设置为 -1
            this.repeat = -1;
        }
    }
}


export default class FrameTicker {
    // 每帧之间的间隔(ms)
    public frameInterval: number = FrameTick;
    // 当前帧号
    public currentFrame: number = 0;

    // 内部定时器列表，key 为 timer.id
    private timers: Map<number, FrameTimer> = new Map();
    // 用于生成定时器ID
    private nextTimerId: number = 1;

    // global
    private startTime: number;

    constructor() {
        this.frameInterval = FrameTick;
        this.currentFrame = 0;
    }

    /**
     * 设置physic.world的开始时间
     */
    initStart() {
        this.startTime = Date.now();
    }

    getCurrentTime() {
        return this.startTime + this.currentFrame * this.frameInterval;
    }

    /**
     * 注册一个定时器
     * @param callback 定时触发的回调函数
     * @param delay 延迟的时间（毫秒）
     * @param args 回调的参数
     * @param context 回调函数执行时的上下文
     * @param repeat 重复次数，0为一次性，-1为无限重复，正数为重复次数
     */
    Register(
        callback: (...args: any[]) => void,
        delay: number,
        args: any[] = [],
        context: any = null,
        repeat: number = 0
    ): FrameTimer {
        // 计算需要延迟多少帧
        const frameDelay = Math.ceil(delay / this.frameInterval);
        const targetFrame = this.currentFrame + frameDelay;
        // 构造定时器对象
        const timer: FrameTimer = new FrameTimer({
            id: this.nextTimerId++,
            targetFrame: targetFrame,
            callback: callback,
            args: args,
            context: context,
            repeat: repeat,
            interval: frameDelay, // 循环定时器的间隔
            ticker: this // 绑定当前的 FrameTicker 实例
        })

        // 添加到定时器列表中
        this.timers.set(timer.id, timer);
        return timer;
    }

    /**
     * 取消注册的定时器
     * @param timer 要取消的定时器对象
     */
    Unregister(timer: FrameTimer): void {
        this.timers.delete(timer.id);
    }

    /**
     * 一次性延迟调用
     * @param callback 定时触发的回调函数
     * @param delay 延迟的时间（毫秒）
     * @param args 回调的参数
     * @param context 回调函数执行时的上下文
     */
    public delayedCall(config: DelayedCallConfigType): FrameTimer {
        const delayedConfig = new DelayedCallConfig(config);
        const { callback, delay, args, context } = delayedConfig;
        return this.Register(callback, delay, args, context, 0);
    }


    /**
     * 添加循环定时事件
     * @param callback 定时触发的回调函数
     * @param startAt 开始于时间(ms)
     * @param delay 延迟的时间（毫秒）
     * @param args 回调的参数
     * @param context 回调函数执行时的上下文
     * @param repeat 重复次数，-1为无限循环，正数为循环次数
     */
    public addEvent(config: AddEventConfigType): FrameTimer {
        // 自动填充默认值
        const eventConfig = new AddEventConfig(config);
        const { callback, delay, startAt, args, context, repeat } = eventConfig;

        if (startAt > 0) {
            // 计算和第一次执行之间的时间差
            const firstDelayMs = delay - startAt;

            const ret = this.Register(() => {
                const leftRepeat = repeat - 1;
                // 找到我这个id的定时器
                const originalID = ret.id;
                const timer = this.timers.get(originalID);
                if (!timer) return; // 如果定时器不存在，直接返回

                // 替换repeat为leftRepeat
                timer.repeat = leftRepeat;

                const frameDelay = Math.ceil(delay / this.frameInterval);
                const targetFrame = this.currentFrame + frameDelay;

                // 替换targetFrame为当前帧+delay
                timer.targetFrame = targetFrame;
                // 替换interval为delay
                timer.interval = frameDelay;
                // 替换callback为原来的callback
                timer.callback = callback;

                // 调用一次
                callback.apply(context, args);
            }, firstDelayMs, args, context, 1);

            return ret;
        } else {
            return this.Register(callback, delay, args, context, repeat);
        }
    }

    /**
     * 每帧的更新调用（需要在游戏帧循环中调用此方法）
     */
    public update(): void {
        this.currentFrame++;

        // 收集需要删除的定时器ID
        const timersToRemove: number[] = [];
        this.timers.forEach((timer) => {
            // 如果当前帧达到或超过目标帧，则触发定时器
            if (this.currentFrame >= timer.targetFrame) {
                // 执行回调，注意使用 apply 传入参数与上下文
                timer.callback.apply(timer.context, timer.args);

                // 如果是循环定时器
                if (timer.repeat < 0 || timer.repeat > 0) {
                    // 如果是有限重复，则减一
                    if (timer.repeat > 0) {
                        timer.repeat--;
                    }
                    // 重新计算下次触发的目标帧
                    timer.targetFrame = this.currentFrame + timer.interval;
                } else {
                    // 一次性定时器或重复结束的定时器，标记为移除
                    timersToRemove.push(timer.id);
                }
            }
        });

        // 移除已经完成的一次性定时器
        timersToRemove.forEach((id) => {
            this.timers.delete(id);
        });
    }
}
