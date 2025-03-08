// Card.tsx
import React, { useState, useEffect } from 'react';
import "../../public/cardslot.css"
import { IRefPhaserGame } from '../game/PhaserGame';
import { Game } from '../game/scenes/Game';
import { EventBus } from '../game/EventBus';

interface CardProps {
    pid: number; // 植物id
    textureKey: string; // 贴图key
    plantName: string; // 名称
    cooldownTime: number; // 最大冷却时间（秒）
    sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
}


// 只关心 src（或 title），保证只在真正变更时才更新
// 嵌入card
// const ImageComponent = React.memo(({ src, alt }) => {
//     return <img src={src} alt={alt} />;
//   }, (prevProps, nextProps) => {
//     return prevProps.src === nextProps.src;
//   });

export default function Card({ pid, plantName, cooldownTime, sceneRef }: CardProps) {
    const [isCoolingDown, setIsCoolingDown] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);
    const [isChosen, setIsChosen] = useState(false);

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
            if (data.pid !== pid) { // 跳过当前选中的卡片
                setIsChosen(false);
            }
        };
        const handlePlant = (data: { pid: number }) => {
            console.log('pid is', data.pid);
            if (data.pid === pid) {
                console.log('slot: card plant', pid);
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

        if (isChosen) {
            setIsChosen(false);
            scene.cancelPrePlant();
            return;
        }

        if (!isCoolingDown) {
            setIsChosen(true);
            scene.chooseCard(pid); // 调用 Game 的 chooseCard
            console.log(`Card ${plantName} (pid=${pid}) chosen`);
        }
    };

    return (
        <button
            className={`card ${isCoolingDown ? 'cooling' : ''} ${isChosen ? 'chosen' : ''}`}
            onClick={handleClick}
            disabled={isCoolingDown}
        >
            <span className="plant-name">{plantName}</span>
            {isCoolingDown && (
                <div
                    className="cooldown-overlay"
                    style={{ animationDuration: `${cooldownTime}s` }}
                />
            )}
        </button>
    );
}

interface EnergyProps {
    energy: number;
};

export function Energy() {

}

export function Shovel() {

}