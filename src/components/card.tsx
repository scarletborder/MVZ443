// Card.tsx
import React, { useState, useEffect } from 'react';
import "../../public/cardslot.css"

interface CardProps {
    plantName: string;
    cooldownTime: number; // 冷却时间（秒）
}

export default function Card({ plantName, cooldownTime }: CardProps) {
    const [isCoolingDown, setIsCoolingDown] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);

    useEffect(() => {
        let timer: any;
        if (isCoolingDown && remainingTime > 0) {
            timer = setInterval(() => {
                setRemainingTime(prev => prev - 0.1);
            }, 100);
        } else if (remainingTime <= 0) {
            setIsCoolingDown(false);
        }
        return () => clearInterval(timer);
    }, [isCoolingDown, remainingTime]);

    const handleClick = () => {
        if (!isCoolingDown) {
            console.log(`使用植物: ${plantName}`);
            setIsCoolingDown(true);
            setRemainingTime(cooldownTime);
        }
    };

    return (
        <button
            className={`card ${isCoolingDown ? 'cooling' : ''}`}
            onClick={handleClick}
            disabled={isCoolingDown}
        >
            <span className="plant-name">{plantName}</span>
            {isCoolingDown && (
                <div
                    className="cooldown-overlay"
                    style={{
                        animationDuration: `${cooldownTime}s`
                    }}
                />
            )}
        </button>
    );
};