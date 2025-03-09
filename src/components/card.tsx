// Card.tsx
import React, { useState, useEffect, useMemo } from 'react';
import "../../public/cardslot.css"
import { IRefPhaserGame } from '../game/PhaserGame';
import { Game } from '../game/scenes/Game';
import { EventBus } from '../game/EventBus';
import { useGameContext } from '../context/garden_ctx';

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
    const { energy } = useGameContext();

    const textureUri = useMemo(() => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current.scene as Game;
        if (!scene || scene.scene.key !== 'Game') {
            console.error('当前场景不是Game');
            return;
        }
        return scene.textures.getBase64(texture);
    }, [texture, pid, sceneRef.current]);

    useEffect(() => {
        let timer: any;
        if (isCoolingDown && remainingTime > 0) {
            timer = setInterval(() => {
                setRemainingTime(prev => Math.max(prev - 0.1, 0));
            }, 100);
        } else if (remainingTime <= 0) {
            setIsCoolingDown(false);
        }
        return () => clearInterval(timer);
    }, [isCoolingDown, remainingTime]);

    useEffect(() => {
        const handleDeselect = (data: { pid: number | null }) => {
            if (data.pid !== pid) {
                setIsChosen(false);
            }
        };
        const handlePlant = (data: { pid: number }) => {
            if (data.pid === pid) {
                setIsChosen(false);
                setIsCoolingDown(true);
                setRemainingTime(cooldownTime);
            }
        };
        EventBus.on('card-deselected', handleDeselect);
        EventBus.on('card-plant', handlePlant);
        return () => {
            EventBus.removeListener('card-deselected', handleDeselect);
            EventBus.removeListener('card-plant', handlePlant);
        };
    }, [pid]);

    const handleClick = () => {
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
            className={`card ${isCoolingDown ? 'cooling' : ''} ${isChosen ? 'chosen' : ''} ${(energy < cost) ? 'expensive' : ''}`}
            onClick={handleClick}
            disabled={isCoolingDown}
        >
            <div className="card-content">
                <div className="plant-name">{plantName}</div>
                <div className="plant-image">
                    <img src={textureUri} alt={plantName} />
                </div>
                <div className="plant-cost">{cost}</div>
            </div>
            {isCoolingDown && (
                <div
                    className="cooldown-overlay"
                    style={{ animationDuration: `${cooldownTime}s` }}
                />
            )}
        </button>
    );
}