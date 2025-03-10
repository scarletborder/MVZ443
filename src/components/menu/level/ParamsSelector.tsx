// src/components/ParamsSelector.tsx
import React, { useState } from 'react';
import { GameParams } from '../../../game/models/GameParams';
import { useGameContext } from '../../../context/garden_ctx';

interface ParamsSelectorProps {
    chapterId: number;
    stageId: number;
    setGameParams: (params: GameParams) => void;
    startGame: () => void;
    onBack: () => void;
}

const availablePlants = ['向日葵', '豌豆射手', '坚果墙', '樱桃炸弹'];

const ParamsSelector: React.FC<ParamsSelectorProps> = ({ chapterId, stageId, setGameParams, startGame, onBack }) => {
    // TODO: 通过context获得plantsProps
    // 同时还要更新garden context
    const [selectedPlants, setSelectedPlants] = useState<string[]>([]);
    const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
    const garden_ctx = useGameContext();

    const handlePlantToggle = (plant: string) => {
        setSelectedPlants(prev =>
            prev.includes(plant) ? prev.filter(p => p !== plant) : [...prev, plant]
        );
    };

    const handleStart = () => {
        garden_ctx.setEnergy(1080);

        const params: GameParams = {
            chapterId,
            stageId,
            plants: selectedPlants,
            difficulty,
        };
        setGameParams(params);
        startGame();
    };

    return (
        <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            position: 'relative',
            overflow: 'hidden',
            border: '2px solid #444',
            boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
        }}>
            {/* 左侧 50% - 植物选择 */}
            <div style={{
                width: '50%',
                height: '100%',
                position: 'absolute',
                left: 0,
                top: 0,
                background: 'rgba(20, 20, 20, 0.85)',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: '#666 #333',
                padding: '60px 20px 20px 20px',
            }}>
                <button
                    style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        padding: '8px 16px',
                        background: 'none',
                        border: '2px solid #666',
                        color: '#ddd',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = '#00ccff';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.borderColor = '#666';
                    }}
                    onClick={onBack}
                >
                    返回
                </button>
                {availablePlants.map((plant) => (
                    <div
                        key={plant}
                        style={{
                            padding: '10px',
                            border: selectedPlants.includes(plant) ? '2px solid #00ccff' : '2px solid rgba(100, 100, 100, 0.5)',
                            marginBottom: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                        }}
                        onClick={() => handlePlantToggle(plant)}
                        onMouseOver={(e) => {
                            if (!selectedPlants.includes(plant)) e.currentTarget.style.borderColor = '#00ccff';
                        }}
                        onMouseOut={(e) => {
                            if (!selectedPlants.includes(plant)) e.currentTarget.style.borderColor = 'rgba(100, 100, 100, 0.5)';
                        }}
                    >
                        {plant}
                    </div>
                ))}
            </div>

            {/* 右侧 50% - 参数选择 */}
            <div style={{
                width: '40%',
                height: '100%',
                position: 'absolute',
                right: 0,
                top: 0,
                padding: '20px',
                color: '#ddd',
                overflowY: 'auto',
                background: 'rgba(30, 30, 30, 0.9)',
            }}>
                <h3>难度选择</h3>
                <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'normal' | 'hard')}
                    style={{
                        padding: '5px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid #666',
                        color: '#ddd',
                        width: '100%',
                        borderRadius: '3px',
                    }}
                >
                    <option value="easy">简单</option>
                    <option value="normal">普通</option>
                    <option value="hard">困难</option>
                </select>

                <button
                    style={{
                        position: 'absolute',
                        bottom: '10%',
                        right: '40%',
                        padding: '10px 20px',
                        background: '#00ccff',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                    }}
                    onClick={handleStart}
                >
                    开始游戏
                </button>
            </div>
        </div>
    );
};

export default ParamsSelector;
