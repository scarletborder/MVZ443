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
    plantName: string;
    cost: number;
    cooldownTime: number;
    sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
    level: number;
}

export default function Card({ pid, texture, plantName, cooldownTime, sceneRef, cost, level }: CardProps) {
    const needFirstCoolDown = PlantFactoryMap[pid].needFirstCoolDown || false;
    const [isCoolingDown, setIsCoolingDown] = useState(needFirstCoolDown);
    const [remainingTime, setRemainingTime] = useState(needFirstCoolDown ? cooldownTime : 0);
    const [isChosen, setIsChosen] = useState(false);
    const { energy, isPaused } = useGameContext();
    const settings = useSettings();

    useEffect(() => {
        const handleSetTimeFlow = (data: { delta: number }) => {
            setRemainingTime(prevRemainingTime => {
                const newRemainingTime = parseFloat((prevRemainingTime - data.delta * 0.001).toFixed(3)); // 保留3位小数
                if (newRemainingTime <= 0) {
                    setIsCoolingDown(false);
                    return 0;
                } else if (newRemainingTime > 0) {
                    setIsCoolingDown(true);
                }
                return newRemainingTime;
            });
        };

        EventBus.on('timeFlow-set', handleSetTimeFlow);
        return () => {
            EventBus.removeListener('timeFlow-set', handleSetTimeFlow);
        };
    }, []); // 保持空的依赖数组


    useEffect(() => {
        const handleDeselect = (data: { pid: number | null }) => {
            if (data.pid !== pid) {
                setIsChosen(false);
            }
        };
        const handlePlant = (data: { pid: number }) => {
            if (data.pid === pid) {
                setIsChosen(false);
                // Use the isPaused value from the component scope
                if (!isPaused) {
                    setIsCoolingDown(true);
                    setRemainingTime(cooldownTime);
                } else {
                    // If paused, wait until unpaused to start cooldown
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


        EventBus.on('card-deselected', handleDeselect);
        EventBus.on('card-plant', handlePlant);

        return () => {
            EventBus.removeListener('card-deselected', handleDeselect);
            EventBus.removeListener('card-plant', handlePlant);

        };
    }, [pid, isPaused, cooldownTime]); // Add isPaused and cooldownTime to dependencies

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
            console.log(`Card ${plantName} (pid=${pid} level=${level}) chosen`);
        }
    };

    return (
        <button
            className={`card ${isCoolingDown ? 'cooling' : ''} ${isChosen ? 'chosen' : ''} 
                ${(energy < cost) ? 'expensive' : ''} ${(isPaused && !settings.isBluePrint) ? 'paused' : ''}`}
            onClick={handleClick}
            disabled={isCoolingDown}
        >
            <div className="card-content">
                <div className="plant-name">{plantName}</div>
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
                    className="cooldown-overlay"
                    style={{
                        animationPlayState: isPaused ? 'paused' : 'running',
                        // 使用剩余时间和冷却时间的比率来设置高度
                        transform: `scaleY(${remainingTime / cooldownTime})`,
                        transformOrigin: 'bottom'
                    }}
                />
            )}

        </button>
    );
}
