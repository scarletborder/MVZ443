import React, { useState, useEffect, useRef } from 'react';
import { IRefPhaserGame } from '../game/PhaserGame';
import { Game } from '../game/scenes/Game';
import { EventBus } from '../game/EventBus';
import { useGameContext } from '../context/garden_ctx';
import { useSettings } from '../context/settings_ctx';

interface CardProps {
    pid: number;
    texture: string;
    plantName: string;
    cost: number;
    cooldownTime: number;
    sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
}

export default function Card({ pid, texture, plantName, cooldownTime, sceneRef, cost }: CardProps) {
    const [isCoolingDown, setIsCoolingDown] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);
    const [isChosen, setIsChosen] = useState(false);
    const { energy, isPaused } = useGameContext();
    const [pausedTime, setPausedTime] = useState(0);
    const settings = useSettings();

    useEffect(() => {
        let timer: any;
        if (isCoolingDown && remainingTime > 0 && !isPaused) {
            // console.log('start cooldown', remainingTime);
            timer = setInterval(() => {
                setRemainingTime(prev => Math.max(prev - 0.1, 0));
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
            scene.chooseCard(pid);
            console.log(`Card ${plantName} (pid=${pid}) chosen`);
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
                            src={`/assets/${texture}.png`}
                            alt={plantName}
                            style={{
                                width: "64px",
                                height: "64px",
                                objectFit: "none",
                                objectPosition: "top left",
                                marginBottom: "8px"
                            }}
                        />
                    )}
                </div>
                <div className="plant-cost">{cost}</div>
            </div>
            {isCoolingDown && (
                <div
                    className="cooldown-overlay"
                    style={{
                        animationDuration: `${cooldownTime}s`,
                        animationPlayState: isPaused ? 'paused' : 'running',
                    }}
                />
            )}
        </button>
    );
}
