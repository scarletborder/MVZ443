import React, { useState, useEffect } from 'react';
import { IRefPhaserGame } from '../../game/PhaserGame';
import { Game } from '../../game/scenes/Game';
import { EventBus } from '../../game/EventBus';
import { useGameContext } from '../../context/garden_ctx';
import { useSettings } from '../../context/settings_ctx';
import { publicUrl } from '../../utils/browser';
import PlantFactoryMap from '../../game/presets/plant';

interface CardProps {
    pid: number;
    texture: string;
    plantName: string; // 保留参数以兼容接口，尽管不显示
    cost: number;
    cooldownTime: number;
    sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
    level: number;
}

export default function VCard({ pid, texture, plantName, cooldownTime, sceneRef, cost, level }: CardProps) {
    const needFirstCoolDown = PlantFactoryMap[pid].needFirstCoolDown || false;
    const [isCoolingDown, setIsCoolingDown] = useState(needFirstCoolDown);
    const [remainingTime, setRemainingTime] = useState(needFirstCoolDown ? cooldownTime : 0);
    const [isChosen, setIsChosen] = useState(false);
    const { energy, isPaused } = useGameContext();
    const [pausedTime, setPausedTime] = useState(0);
    const [timeFlow, setTimeFlow] = useState(0.1);
    const settings = useSettings();
    const speedFactor = timeFlow * 10; // 调整此值以控制冷却速度

    // [保持原有的 useEffect 逻辑不变]
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isCoolingDown && remainingTime > 0 && !isPaused) {
            timer = setInterval(() => {
                setRemainingTime(prev => Math.max(prev - timeFlow, 0));
            }, 100);
        } else if (remainingTime <= 0 && !isPaused) {
            setIsCoolingDown(false);
        }
        return () => clearInterval(timer);
    }, [isCoolingDown, remainingTime, isPaused]);

    useEffect(() => {
        if (isPaused) {
            setPausedTime(remainingTime);
        } else {
            if (pausedTime > 0) {
                setRemainingTime(pausedTime);
                setPausedTime(0);
                setIsCoolingDown(true);
            }
        }
    }, [isPaused]);

    useEffect(() => {
        const handleDeselect = (data: { pid: number | null }) => {
            if (data.pid !== pid) {
                setIsChosen(false);
            }
        };
        const handlePlant = (data: { pid: number }) => {
            if (data.pid === pid) {
                setIsChosen(false);
                if (!isPaused) {
                    setIsCoolingDown(true);
                    setRemainingTime(cooldownTime);
                } else {
                    setRemainingTime(cooldownTime);
                    setIsCoolingDown(true);
                    const timer = setInterval(() => {
                        if (!isPaused) {
                            console.log('resume');
                            clearInterval(timer);
                        }
                    }, 100);
                }
            }
        };
        const handleSetTimeFlow = (data: { timeFlow: number }) => {
            setTimeFlow(data.timeFlow * 0.1);
        };
        EventBus.on('card-deselected', handleDeselect);
        EventBus.on('card-plant', handlePlant);
        EventBus.on('timeFlow-set', handleSetTimeFlow);
        return () => {
            EventBus.removeListener('card-deselected', handleDeselect);
            EventBus.removeListener('card-plant', handlePlant);
            EventBus.removeListener('timeFlow-set', handleSetTimeFlow);
        };
    }, [pid, isPaused, cooldownTime]);

    const handleClick = () => {
        if (isPaused && !settings.isBluePrint) {
            return;
        }
        if (!sceneRef.current) return;
        const scene = sceneRef.current.scene as Game;
        if (!scene || scene.scene.key !== 'Game') {
            console.error('当前场景不是Game');
            return;
        }

        if (energy < cost) {
            console.log('Not enough energy');
            return;
        }

        if (isChosen) {
            setIsChosen(false);
            scene.cancelPrePlant();
            return;
        }

        if (!isCoolingDown) {
            setIsChosen(true);
            scene.chooseCard(pid, level);
            console.log(`Card (pid=${pid} level=${level}) chosen`);
        }
    };

    return (
        <button
            className={`horizontal-card ${isCoolingDown ? 'cooling' : ''} ${isChosen ? 'chosen' : ''} 
                ${(energy < cost) ? 'expensive' : ''} ${(isPaused && !settings.isBluePrint) ? 'paused' : ''}`}
            onClick={handleClick}
            disabled={isCoolingDown}
        >
            <div className="horizontal-card-content">
                <div className="plant-image">
                    {texture && texture !== "" && (
                        <img
                            src={`${publicUrl}/assets/card/${texture}.png`}
                            alt={plantName}
                            style={{
                                width: "100%",
                                height: "100%",
                            }}
                            draggable="false"
                        />
                    )}
                </div>
                <div className="plant-cost">{cost}</div>
            </div>
            {isCoolingDown && (
                <div
                    className="Vcooldown-overlay"
                    style={{
                        animationDuration: `${cooldownTime / speedFactor}s`,
                        animationPlayState: isPaused ? 'paused' : 'running',
                    }}
                />
            )}
        </button>
    );
}
