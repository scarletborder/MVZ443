// src/components/ParamsSelector.tsx
import React, { useEffect, useState } from 'react';
import { GameParams } from '../../../game/models/GameParams';
import { useGameContext } from '../../../context/garden_ctx';
import { useSaveManager } from '../../../context/save_ctx';
import { PlantFactoryMap, StageDataRecords } from '../../../game/utils/loader';
import { publicUrl } from '../../../utils/browser';
import i18n from '../../../utils/i18n';
import { useSettings } from '../../../context/settings_ctx';

interface ParamsSelectorProps {
    chapterId: number;
    stageId: number;
    setGameParams: (params: GameParams) => void;
    startGame: () => void;
    onBack: () => void;
}

interface PlantElem {
    pid: number;
    name: string;
    imgUrl: string;
    level: number;
}


const ParamsSelector: React.FC<ParamsSelectorProps> = ({ stageId, setGameParams, startGame, onBack }) => {
    const [selectedPlants, setSelectedPlants] = useState<number[]>([]);
    const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
    const [availablePlants, setAvailablePlants] = useState<PlantElem[]>([]);
    const garden_ctx = useGameContext();
    const { currentProgress } = useSaveManager();
    const settings = useSettings();

    const handlePlantToggle = (pid: number) => {
        setSelectedPlants(prev =>
            prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
        );
    };

    useEffect(() => {
        const plantProgress = currentProgress.plants;
        if (!plantProgress || plantProgress.length < 1) {
            console.log("No plant progress available:", currentProgress);
            setAvailablePlants([]);
            return;
        }

        let newAvailablePlants: PlantElem[] = [];
        for (let i = 0; i < plantProgress.length; ++i) {
            const pid = plantProgress[i].pid;
            const plantObj = PlantFactoryMap[pid];
            if (!plantObj) {
                console.warn(`Plant with pid ${pid} not found in PlantFactoryMap`);
                continue;
            }
            const newPlant: PlantElem = {
                pid: pid,
                name: plantObj.name,
                imgUrl: `${publicUrl}/assets/card/${plantObj.texture}.png`,
                level: plantProgress[i].level
            };
            newAvailablePlants.push(newPlant);
        }
        newAvailablePlants = newAvailablePlants.sort((a, b) => a.pid - b.pid);
        setAvailablePlants(newAvailablePlants);
    }, [currentProgress]);

    const handleStart = () => {
        const _ = () => { console.log('no gameexit Implemented') };

        const params: GameParams = {
            level: stageId,
            plants: selectedPlants,
            difficulty,
            gameExit: _,
            setInitialEnergy: garden_ctx.setEnergy,
            gameSettings: {
                isBluePrint: settings.isBluePrint,
                isDebug: settings.isDebug
            }
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
            display: 'flex'
        }}>
            {/* 左侧 - 植物选择 */}
            <div style={{
                width: '60%',
                height: '100%',
                background: 'rgba(20, 20, 20, 0.85)',
                overflowY: 'auto',
                padding: '60px 20px 20px 20px',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    position: 'absolute',
                    top: '10px',
                    left: '10px'
                }}>
                    <button
                        style={{
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
                    <div style={{
                        marginLeft: '10px',
                        color: '#ddd',
                        fontSize: '16px'
                    }}>
                        {`stage ${stageId} - ${StageDataRecords[stageId].name}`}
                    </div>
                </div>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    justifyContent: 'flex-start'
                }}>
                    {availablePlants.map((plant) => (
                        <div
                            key={plant.pid}
                            style={{
                                width: '11.5%',
                                aspectRatio: '1 / 1.5',
                                border: selectedPlants.includes(plant.pid)
                                    ? '2px solid #00ccff'
                                    : '2px solid rgba(100, 100, 100, 0.5)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '5px',
                                background: 'rgba(255, 255, 255, 0.05)'
                            }}
                            onClick={() => handlePlantToggle(plant.pid)}
                            onMouseOver={(e) => {
                                if (!selectedPlants.includes(plant.pid))
                                    e.currentTarget.style.borderColor = '#00ccff';
                            }}
                            onMouseOut={(e) => {
                                if (!selectedPlants.includes(plant.pid))
                                    e.currentTarget.style.borderColor = 'rgba(100, 100, 100, 0.5)';
                            }}
                        >
                            <div style={{ width: "64px", height: "64px", overflow: "hidden" }}>
                                <img
                                    src={plant.imgUrl}
                                    alt={plant.name}
                                    style={{ display: "block" }}
                                    draggable="false"
                                />
                            </div>
                            <span style={{
                                color: '#ddd',
                                textAlign: 'center',
                                fontSize: '12px',
                                marginTop: '5px'
                            }}>
                                {plant.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 右侧 - 参数和已选择植物 */}
            <div style={{
                width: '40%',
                height: '100%',
                padding: '20px',
                color: '#ddd',
                background: 'rgba(30, 30, 30, 0.9)',
                display: 'flex',
                flexDirection: 'column'
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
                        marginBottom: '1%'
                    }}
                >
                    <option value="easy">简单</option>
                    <option value="normal">普通</option>
                    <option value="hard">困难</option>
                </select>

                <h3>已选择植物</h3>
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    maxHeight: '63%',
                }}>
                    {selectedPlants.map(pid => {
                        const plant = availablePlants.find(p => p.pid === pid);
                        if (!plant) return null;
                        return (
                            <div
                                key={pid}
                                style={{
                                    display: 'flex',
                                    maxHeight: '10%',
                                    alignItems: 'center',
                                    padding: '10px',
                                    border: '1px solid #666',
                                    marginBottom: '10px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    transition: 'border 0.3s, background 0.3s',
                                }}
                                onClick={() => handlePlantToggle(plant.pid)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.border = '1px solid red';
                                    e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.border = '1px solid #666';
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                }}
                            >
                                <div style={{ overflow: "hidden" }}>
                                    <img
                                        src={plant.imgUrl}
                                        alt={plant.name}
                                        style={{ display: "block", width: "90%", height: "80%" }}
                                        draggable="false"

                                    />
                                </div>
                                <span style={{ marginLeft: '10px' }}>{plant.name}</span>
                            </div>
                        );
                    })}
                </div>

                <button
                    style={{
                        padding: '3% 40%',
                        background: '#00ccff',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        alignSelf: 'center'
                    }}
                    onClick={handleStart}
                >
                    {`${i18n('start')}`}
                </button>
            </div>
        </div>)
};

export default ParamsSelector;
