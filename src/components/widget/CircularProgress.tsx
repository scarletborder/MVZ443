import { useEffect, useState, useRef } from 'react';
import { useMemoizedFn } from 'ahooks';
import { EventBus } from '../../game/EventBus';

interface CircularProgressProps {
    timeInterval: number;
    isAdd: boolean;
    active: boolean;
    isPaused: boolean;
    startDelay?: number;
    size?: number;
    onReset?: () => void;
}

// 圆形进度条组件
export default function CircularProgress({
    timeInterval,
    isAdd,
    active,
    isPaused,
    startDelay = 0,
    size = 60,
    onReset
}: CircularProgressProps) {
    const [progress, setProgress] = useState(0);
    const [currentCycle, setCurrentCycle] = useState(0); // 追踪当前是第几个周期
    const [isCompleting, setIsCompleting] = useState(false); // 是否正在完成动画
    const [opacity, setOpacity] = useState(0.8); // 控制透明度
    const [isInStartDelay, setIsInStartDelay] = useState(false); // 是否在首次延迟阶段

    // 使用 ref 来跟踪剩余时间，避免状态更新的复杂性
    const remainingTimeRef = useRef(0);

    // resetTime 函数：平滑重置时间并调用回调
    const resetTime = useMemoizedFn(() => {
        setIsCompleting(true);

        // 首先显示完成状态（100%进度 + 明亮效果）
        setProgress(1);
        setOpacity(1);

        // 短暂的完成闪烁效果
        setTimeout(() => {
            // 开始淡出动画
            const fadeOut = () => {
                setOpacity(prev => {
                    const newOpacity = prev - 0.08;
                    if (newOpacity <= 0) {
                        // 淡出完成，重置所有状态
                        setTimeout(() => {
                            setProgress(0);
                            setCurrentCycle(prev => prev + 1);
                            // 重新开始时设置新的剩余时间
                            remainingTimeRef.current = timeInterval / 1000; // 转换为秒
                            setIsInStartDelay(false);
                            setIsCompleting(false);
                            setOpacity(0.8); // 重置透明度
                            onReset?.();
                        }, 50); // 短暂延迟后重新开始
                        return 0;
                    }
                    requestAnimationFrame(fadeOut);
                    return newOpacity;
                });
            };

            requestAnimationFrame(fadeOut);
        }, 150); // 完成状态显示150ms
    });

    // 初始化和重置逻辑
    useEffect(() => {
        if (!active || timeInterval <= 0) {
            setProgress(0);
            remainingTimeRef.current = 0;
            setCurrentCycle(0);
            setIsCompleting(false);
            setOpacity(0.8);
            setIsInStartDelay(false);
            return;
        }

        // 初始化状态
        setProgress(0);
        setCurrentCycle(0);
        setIsCompleting(false);
        setOpacity(0.8);

        // 设置初始剩余时间
        if (currentCycle === 0 && startDelay > 0) {
            setIsInStartDelay(true);
            remainingTimeRef.current = startDelay / 1000; // 首次延迟，转换为秒
        } else {
            setIsInStartDelay(false);
            remainingTimeRef.current = timeInterval / 1000; // 正常间隔，转换为秒
        }
    }, [timeInterval, active, startDelay, currentCycle]);

    // 监听时间流事件，类似 card.tsx 的逻辑
    useEffect(() => {
        const handleSetTimeFlow = (data: { delta: number }) => {
            if (!active || isPaused || isCompleting) return;

            remainingTimeRef.current = parseFloat((remainingTimeRef.current - data.delta * 0.001).toFixed(3)); // 保留3位小数

            if (remainingTimeRef.current <= 0) {
                // 时间到了
                if (isInStartDelay) {
                    // 首次延迟结束，开始正常循环
                    setIsInStartDelay(false);
                    remainingTimeRef.current = timeInterval / 1000;
                    setProgress(0);
                } else {
                    // 正常循环完成，触发重置
                    resetTime();
                    return;
                }
            } else {
                // 更新进度
                const totalTime = isInStartDelay ? (startDelay / 1000) : (timeInterval / 1000);
                const newProgress = 1 - (remainingTimeRef.current / totalTime);
                setProgress(Math.min(1, Math.max(0, newProgress)));
            }
        };

        EventBus.on('timeFlow-set', handleSetTimeFlow);
        return () => {
            EventBus.removeListener('timeFlow-set', handleSetTimeFlow);
        };
    }, [active, isPaused, isCompleting, isInStartDelay, timeInterval, startDelay, resetTime]);

    // SVG参数
    const radius = size / 2 - 5;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    // 动态样式
    const circleStyle = {
        transition: isCompleting ? 'stroke-dashoffset 0.1s ease-out, opacity 0.1s ease-out' : 'none',
        opacity: opacity,
        filter: isCompleting && progress >= 1 ? 'drop-shadow(0 0 8px currentColor)' : 'none',
    };

    const containerStyle = {
        opacity: opacity,
        transition: isCompleting ? 'opacity 0.3s ease-out' : 'none',
    };

    return (
        <div style={{
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...containerStyle
        }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* 背景圆环 */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    style={{ opacity: 0.2 }}
                />
                {/* 进度圆环 */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={isAdd ? "#4CAF50" : "#FF6B6B"}
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={circleStyle}
                />
            </svg>
        </div>
    );
}
