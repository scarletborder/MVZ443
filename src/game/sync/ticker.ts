// game中掌管时间的神
import { FrameTick } from "../../../public/constants";

// 定时器基础类，可用作对外接口
export class FrameTimer {
    public id: number = 0;        // 定时器唯一ID
    public left: number = 0;      // 剩余帧数（仅作参考）

    // 计算剩余时间（毫秒）
    public GetLeftTime(): number {
        return this.left * FrameTick;
    }
}

// 内部的定时器接口，扩展了FrameTimer用于内部调度管理
interface IFrameTimer extends FrameTimer {
    targetFrame: number;        // 目标帧数（到达此帧时执行回调）
    callback: (...args: any[]) => void;  // 定时回调函数
    args: any[];                // 参数数组
    context: any;               // 执行回调时的上下文
    repeat: number;             // 重复次数：0表示一次性，正数表示剩余重复次数，-1表示无限重复
    interval: number;           // 循环定时任务的帧间隔
}

export default class FrameTicker {
    // 每帧之间的间隔(ms)
    public frameInterval: number = FrameTick;
    // 当前帧号
    public currentFrame: number = 0;

    // 内部定时器列表，key 为 timer.id
    private timers: Map<number, IFrameTimer> = new Map();
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
    private Register(
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
        const timer: IFrameTimer = {
            id: this.nextTimerId++,
            left: frameDelay,
            targetFrame,
            callback,
            args,
            context,
            repeat,
            interval: frameDelay,
            GetLeftTime: function (): number {
                return this.left * FrameTick;
            }
        };

        // 添加到定时器列表中
        this.timers.set(timer.id, timer);
        return timer;
    }

    /**
     * 取消注册的定时器
     * @param timer 要取消的定时器对象
     */
    public Unregister(timer: FrameTimer): void {
        this.timers.delete(timer.id);
    }

    /**
     * 一次性延迟调用
     * @param callback 定时触发的回调函数
     * @param delay 延迟的时间（毫秒）
     * @param args 回调的参数
     * @param context 回调函数执行时的上下文
     */
    public delayedCall(
        callback: (...args: any[]) => void,
        delay: number,
        args: any[] = [],
        context: any = null
    ): FrameTimer {
        return this.Register(callback, delay, args, context, 0);
    }

    /**
     * 添加循环定时事件
     * @param callback 定时触发的回调函数
     * @param delay 延迟的时间（毫秒）
     * @param args 回调的参数
     * @param context 回调函数执行时的上下文
     * @param repeat 重复次数，-1为无限循环，正数为循环次数
     */
    public addEvent(
        callback: (...args: any[]) => void,
        delay: number,
        args: any[] = [],
        context: any = null,
        repeat: number = -1
    ): FrameTimer {
        return this.Register(callback, delay, args, context, repeat);
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
                if (timer.repeat === -1 || timer.repeat > 0) {
                    // 如果是有限重复，则减一
                    if (timer.repeat > 0) {
                        timer.repeat--;
                    }
                    // 重新计算下次触发的目标帧
                    timer.targetFrame = this.currentFrame + timer.interval;
                    // 更新left（剩余帧数，可选用于调试）
                    timer.left = timer.interval;
                } else {
                    // 一次性定时器或重复结束的定时器，标记为移除
                    timersToRemove.push(timer.id);
                }
            } else {
                // 更新剩余帧数，仅供调试或额外功能使用
                timer.left = timer.targetFrame - this.currentFrame;
            }
        });

        // 移除已经完成的一次性定时器
        timersToRemove.forEach((id) => {
            this.timers.delete(id);
        });
    }
}
