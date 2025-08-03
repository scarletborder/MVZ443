import { useEffect, useState, useRef } from 'react';
import { useThrottleFn, useMemoizedFn } from 'ahooks';
import { useGameContext } from '../../context/garden_ctx';
import { EventBus } from '../../game/EventBus';
import { publicUrl } from '../../utils/browser';
import useDarkMode from '../../hooks/useDarkMode';
import { gameStateManager } from '../../game/utils/GameStateManager';
import CircularProgress from './CircularProgress';

interface EnergyDisplayProps {
    /** 布局方向 */
    direction: 'vertical' | 'horizontal';
    /** 能量定时器配置 */
    energyTimer?: {
        timeInterval: number;  // 间隔时间（毫秒）
        energyDelta: number;   // 能量变化值
        startDelay?: number;   // 首次延迟（毫秒）
    };
}

export function EnergyDisplay({ direction, energyTimer }: EnergyDisplayProps) {
    const isDarkMode = useDarkMode();
    const { updateEnergy, isPaused } = useGameContext();
    const [energy, setEnergy] = useState(gameStateManager.getCurrentEnergy());
    const [isEnergyInsufficient, setIsEnergyInsufficient] = useState(false);
    const [resetTrigger, setResetTrigger] = useState(0);
    const insufficientTimeoutRef = useRef<NodeJS.Timeout>();

    // 能量定时器状态
    const [isInStartDelay, setIsInStartDelay] = useState(false);
    const [timerActive, setTimerActive] = useState(false);
    const remainingTimeRef = useRef(0);

    // 监听能量变化
    useEffect(() => {
        const handleEnergyUpdate = (newEnergy: number) => {
            setEnergy(newEnergy);
        };

        gameStateManager.onEnergyUpdate(handleEnergyUpdate);
        setEnergy(gameStateManager.getCurrentEnergy());

        return () => {
            gameStateManager.removeEnergyUpdateListener(handleEnergyUpdate);
        };
    }, []);

    // 初始化能量定时器
    useEffect(() => {
        if (!energyTimer || energyTimer.energyDelta === 0) {
            setTimerActive(false);
            gameStateManager.setEnergyNaturalChangeState(0, false);
            return;
        }

        // 设置自然变化状态（用于UI显示）
        gameStateManager.setEnergyNaturalChangeState(energyTimer.timeInterval, energyTimer.energyDelta > 0);
        setTimerActive(true);

        // 初始化定时器状态
        if (energyTimer.startDelay && energyTimer.startDelay > 0) {
            setIsInStartDelay(true);
            remainingTimeRef.current = energyTimer.startDelay / 1000; // 转换为秒
        } else {
            setIsInStartDelay(false);
            remainingTimeRef.current = energyTimer.timeInterval / 1000; // 转换为秒
        }
    }, [energyTimer]);

    // 监听时间流事件，处理能量定时器逻辑
    useEffect(() => {
        if (!energyTimer || !timerActive) return;

        const handleSetTimeFlow = (data: { delta: number }) => {
            if (isPaused) return;

            remainingTimeRef.current = parseFloat((remainingTimeRef.current - data.delta * 0.001).toFixed(3));

            if (remainingTimeRef.current <= 0) {
                if (isInStartDelay) {
                    // 首次延迟结束，开始正常能量定时器
                    setIsInStartDelay(false);
                    remainingTimeRef.current = energyTimer.timeInterval / 1000;
                } else {
                    // 定时器触发，增加能量
                    updateEnergy(energyTimer.energyDelta);
                    setResetTrigger(prev => prev + 1); // 触发进度条重置

                    // 重置定时器
                    remainingTimeRef.current = energyTimer.timeInterval / 1000;
                }
            }
        };

        EventBus.on('timeFlow-set', handleSetTimeFlow);
        return () => {
            EventBus.removeListener('timeFlow-set', handleSetTimeFlow);
        };
    }, [energyTimer, timerActive, isPaused, isInStartDelay, updateEnergy]);

    // 处理能量不足提示
    const { run: handleEnergyInsufficient } = useThrottleFn(() => {
        setIsEnergyInsufficient(true);

        if (insufficientTimeoutRef.current) {
            clearTimeout(insufficientTimeoutRef.current);
        }

        insufficientTimeoutRef.current = setTimeout(() => {
            setIsEnergyInsufficient(false);
        }, direction === 'vertical' ? 350 : 800);
    }, { wait: direction === 'vertical' ? 400 : 500 });

    // 进度条重置回调
    const handleProgressReset = useMemoizedFn(() => {
        console.log('Energy natural timer reset');
    });

    // 监听外部重置事件
    const handleTimerReset = useMemoizedFn(() => {
        setResetTrigger(prev => prev + 1);
    });

    // 处理来自游戏的能量更新事件
    const handleGameEnergyUpdate = useMemoizedFn((data: { energyChange: number, special?: (prev: number) => number }) => {
        updateEnergy(+data.energyChange, data.special);
    });

    // 处理植物种植事件（消耗能量）
    const handlePlant = useMemoizedFn((_data: { pid: number, level: number }) => {
        // 这个事件在其他地方已经处理，这里不需要重复处理
        // 但保留监听以保持兼容性
    });

    // 监听事件
    useEffect(() => {
        EventBus.on('energy-insufficient', handleEnergyInsufficient);
        EventBus.on('energy-timer-reset', handleTimerReset);
        EventBus.on('energy-update', handleGameEnergyUpdate); // 监听游戏中的能量更新事件
        EventBus.on('card-plant', handlePlant); // 保持兼容性

        return () => {
            EventBus.removeListener('energy-insufficient', handleEnergyInsufficient);
            EventBus.removeListener('energy-timer-reset', handleTimerReset);
            EventBus.removeListener('energy-update', handleGameEnergyUpdate);
            EventBus.removeListener('card-plant', handlePlant);
            if (insufficientTimeoutRef.current) {
                clearTimeout(insufficientTimeoutRef.current);
            }
        };
    }, [handleEnergyInsufficient, handleTimerReset, handleGameEnergyUpdate, handlePlant]);

    // 获取自然变化状态（用于进度条显示）
    const naturalChangeState = gameStateManager.getEnergyNaturalChangeState();

    if (direction === 'vertical') {
        return (
            <div style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
                width: '6%',
                minWidth: "6%",
                maxWidth: '150px',
                height: "100%",
                padding: '10px',
                color: 'black',
                textAlign: 'center',
                paddingTop: '5px',
                paddingBottom: '15px'
            }}>
                <div style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '65px',
                    height: '65px',
                    marginBottom: '-5px'
                }}>
                    <img src={`${publicUrl}/assets/sprite/redstone.png`} alt="energy"
                        style={{
                            width: '42px',
                            height: '42px',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            marginBottom: 0
                        }}
                        draggable="false" />
                    <CircularProgress
                        timeInterval={naturalChangeState.timeInterval}
                        isAdd={naturalChangeState.isAdd}
                        active={naturalChangeState.active}
                        isPaused={isPaused}
                        startDelay={energyTimer?.startDelay || 0}
                        size={65}
                        onReset={handleProgressReset}
                        key={resetTrigger}
                    />
                </div>
                <p style={{
                    fontSize: '1.6em',
                    color: isEnergyInsufficient
                        ? '#F44336'
                        : (isDarkMode ? '#e0e0e0' : 'black'),
                    margin: '0',
                    marginTop: '-3px',
                    transition: 'color 0.3s ease'
                }}>{energy}</p>
            </div>
        );
    }

    // horizontal layout
    return (
        <div style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
            width: '100%',
            padding: '5px 10px',
            color: 'black',
            textAlign: 'center',
            gap: '8px'
        }}>
            <div style={{
                position: 'relative',
                display: 'inline-block',
                width: '60px',
                height: '60px'
            }}>
                <img src={`${publicUrl}/assets/sprite/redstone.png`} alt="energy"
                    style={{
                        width: '40px',
                        height: '40px',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}
                    draggable="false" />
                <CircularProgress
                    timeInterval={naturalChangeState.timeInterval}
                    isAdd={naturalChangeState.isAdd}
                    active={naturalChangeState.active}
                    isPaused={isPaused}
                    startDelay={energyTimer?.startDelay || 0}
                    size={60}
                    onReset={handleProgressReset}
                    key={resetTrigger}
                />
            </div>
            <p style={{
                margin: 0,
                fontSize: '1.5em',
                color: isEnergyInsufficient
                    ? '#F44336'
                    : (isDarkMode ? '#e0e0e0' : 'black'),
                transition: 'color 0.3s ease',
                marginTop: '-2px'
            }}>{energy}</p>
        </div>
    );
}
