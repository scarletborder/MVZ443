import { useEffect, useState } from 'react';
import { IRefPhaserGame } from '../../game/PhaserGame';
import Card from './card';
import PlantFactoryMap from '../../game/presets/plant';
import { useGameContext } from '../../context/garden_ctx';
import { EventBus } from '../../game/EventBus';
import { IRecord } from '../../game/models/IRecord';
import { useSaveManager } from '../../context/save_ctx';
import { GameParams } from '../../game/models/GameParams';
import VCard from './vcard';
import { publicUrl } from '../../utils/browser';
import { useDeviceType } from '../../hooks/useDeviceType';
import Pickaxe from './pickaxe';
import useDarkMode from '../../hooks/useDarkMode';

interface slotProps {
    sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
    gameParams: GameParams | null;
}

export function EnergySlot() {
    const isDarkMode = useDarkMode();
    const { energy, updateEnergy } = useGameContext();

    useEffect(() => {
        // 处理种植消耗
        const handlePlant = (data: { pid: number, level: number }) => {
            // 通过pid获知cost
            const cost = PlantFactoryMap[data.pid]?.cost(data.level);
            updateEnergy(-cost);
        };
        // 更新能量
        const handleUpdateEnergy = (data: { energyChange: number, special?: (prev: number) => number }) => {
            // energy add or decrease
            updateEnergy(+data.energyChange, data.special);
            // TODO: 增加动画
        };

        EventBus.on('card-plant', handlePlant);
        EventBus.on('energy-update', handleUpdateEnergy);
        return () => {
            EventBus.removeListener('card-plant', handlePlant);
            EventBus.removeListener('energy-update', handleUpdateEnergy);
        }
    }, [updateEnergy]);
    return (
        <div style={{
            display: "flex",  // 关键：启用 Flexbox 布局
            flexDirection: "column",
            justifyContent: "center",  // 让内容垂直居中
            alignItems: "center",
            backgroundColor: isDarkMode ? '#333' : '#f0f0f0', // 夜色模式背景
            width: '6%',
            minWidth: "6%",
            maxWidth: '150px', // 避免过窄
            height: "100%",
            padding: '10px',
            color: 'black',
            textAlign: 'center',
        }}>
            <img src={`${publicUrl}/assets/sprite/redstone.png`} alt="energy"
                style={{ width: '40px', height: '40px', marginBottom: '10px' }} draggable="false" />
            <p style={{
                fontSize: '1.6em',
                color: isDarkMode ? '#e0e0e0' : 'black',
                margin: 0  // 去除默认外边距
            }}>{energy}</p>
        </div>
    )
}


export function VerticalEnergySlot() {
    const isDarkMode = useDarkMode();
    const { energy, updateEnergy } = useGameContext();

    useEffect(() => {
        // 处理种植消耗
        const handlePlant = (data: { pid: number, level: number }) => {
            // 通过pid获知cost
            const cost = PlantFactoryMap[data.pid]?.cost(data.level);
            updateEnergy(-cost);
        };
        // 更新能量
        const handleUpdateEnergy = (data: { energyChange: number }) => {
            // energy add or decrease
            updateEnergy(+data.energyChange);
            // TODO: 增加动画
        };

        EventBus.on('card-plant', handlePlant);
        EventBus.on('energy-update', handleUpdateEnergy);
        return () => {
            EventBus.removeListener('card-plant', handlePlant);
            EventBus.removeListener('energy-update', handleUpdateEnergy);
        }
    }, [updateEnergy]);
    return (
        <div style={{
            display: "flex",  // 关键：使用 Flexbox 布局
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isDarkMode ? '#333' : '#f0f0f0', // 夜色模式背景
            width: '100%',
            padding: '10px',
            color: 'black',
            textAlign: 'center',
            gap: '10px'  // 增加间距
        }}>
            <img src={`${publicUrl}/assets/sprite/redstone.png`} alt="energy"
                style={{ width: '40px', height: '40px' }} draggable="false" />
            <p style={{ margin: 0, fontSize: '1.5em', color: isDarkMode ? '#e0e0e0' : 'black', }}>{energy}</p>
        </div>

    )
}

export function CardSlotHorizontal({ sceneRef, gameParams }: slotProps) {
    const isDarkMode = useDarkMode();
    // PC 用主要卡槽
    const MaxCardNumber = 10;
    const { currentProgress } = useSaveManager();
    const [plants, setPlants] = useState<Array<IRecord>>([]);
    // 使用 WeakMap 来记录 pid 到 level 的映射
    const [pidToLevelMap, setPidToLevelMap] = useState<Map<number, number>>(new Map());

    useEffect(() => {
        if (!gameParams) {
            return;
        }

        const newPlants: Array<IRecord> = gameParams.plants.slice(0, MaxCardNumber)
            .map(pid => PlantFactoryMap[pid])
            .filter(Boolean);

        setPlants(newPlants);

        const newPidToLevelMap = new Map(pidToLevelMap);
        currentProgress.plants.forEach(plant => {
            if (gameParams.plants.includes(plant.pid)) {
                newPidToLevelMap.set(plant.pid, plant.level);
            }
        });

        setPidToLevelMap(newPidToLevelMap);
    }, [gameParams, currentProgress]);




    return (<div style={{
        display: 'flex',
        flexDirection: "row",
        justifyContent: 'flex-start',
        backgroundColor: isDarkMode ? '#333' : '#f0f0f0', // 夜色模式背景
        width: '100%',
        height: "100%",
        alignItems: "center",
    }} >
        {plants.map((plant, index) => (
            <Card
                key={index}
                plantName={plant.nameKey}
                cooldownTime={plant.cooldownTime((pidToLevelMap.get(plant.pid) || 1))}
                sceneRef={sceneRef}
                pid={plant.pid}
                texture={plant.texture}
                cost={plant.cost(pidToLevelMap.get(plant.pid) || 1)}
                level={pidToLevelMap.get(plant.pid) || 1}
            />
        ))}
    </div>);
}



export function CardSlotVertical({ sceneRef, gameParams }: slotProps) {
    const isDarkMode = useDarkMode();
    // Mobile 用主要卡槽
    const MaxCardNumber = 9;
    const { currentProgress } = useSaveManager();
    const [plants, setPlants] = useState<Array<IRecord>>([]);
    const [pidToLevelMap, setPidToLevelMap] = useState<Map<number, number>>(new Map());

    useEffect(() => {
        if (!gameParams) {
            return;
        }

        const newPlants: Array<IRecord> = gameParams.plants.slice(0, MaxCardNumber)
            .map(pid => PlantFactoryMap[pid])
            .filter(Boolean);

        setPlants(newPlants);

        const newPidToLevelMap = new Map(pidToLevelMap);
        currentProgress.plants.forEach(plant => {
            if (gameParams.plants.includes(plant.pid)) {
                newPidToLevelMap.set(plant.pid, plant.level);
            }
        });

        setPidToLevelMap(newPidToLevelMap);
    }, [gameParams, currentProgress]);


    return (
        <div style={{
            display: 'flex',
            flexDirection: "column", /* 保持垂直排列 */
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            width: '120%', /* 调整宽度以适应横向卡片 */
            height: "91%",
            backgroundColor: isDarkMode ? '#333' : '#f0f0f0', // 夜色模式背景
        }}>
            {plants.map((plant, index) => (
                <VCard
                    key={index}
                    plantName={plant.nameKey} // 保留参数但不显示
                    cooldownTime={plant.cooldownTime((pidToLevelMap.get(plant.pid) || 1))}
                    sceneRef={sceneRef}
                    pid={plant.pid}
                    texture={plant.texture}
                    cost={plant.cost(pidToLevelMap.get(plant.pid) || 1)}
                    level={pidToLevelMap.get(plant.pid) || 1}
                />
            ))}
        </div>
    );
}


// 永远竖向排列,有pickaxe和剩余的卡片
export function ViceCardSlot({ sceneRef, gameParams }: slotProps) {
    const isDarkMode = useDarkMode();

    const ExistedCards = useDeviceType() === 'pc' ? 10 : 9;
    const { currentProgress } = useSaveManager();
    const [plants, setPlants] = useState<Array<IRecord>>([]);
    // 使用 WeakMap 来记录 pid 到 level 的映射
    const [pidToLevelMap, setPidToLevelMap] = useState<Map<number, number>>(new Map());

    useEffect(() => {
        if (!gameParams) {
            return;
        }

        if (gameParams.plants.length > ExistedCards) {
            const newPlants: Array<IRecord> = gameParams.plants.slice(ExistedCards)
                .map(pid => PlantFactoryMap[pid])
                .filter(Boolean);

            setPlants(newPlants);

            const newPidToLevelMap = new Map(pidToLevelMap);
            currentProgress.plants.forEach(plant => {
                if (gameParams.plants.includes(plant.pid)) {
                    newPidToLevelMap.set(plant.pid, plant.level);
                }
            });

            setPidToLevelMap(newPidToLevelMap);
        } else {
            setPlants([]);
        }


    }, [gameParams, currentProgress]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: "row",
            justifyContent: 'flex-start',
            width: '100%',
            height: "100%",
            backgroundColor: isDarkMode ? '#333' : '#f0f0f0', // 夜色模式背景
        }} >
            <Pickaxe sceneRef={sceneRef} />
            {plants.map((plant, index) => (
                <Card
                    key={index}
                    plantName={plant.nameKey}
                    cooldownTime={plant.cooldownTime((pidToLevelMap.get(plant.pid) || 1))}
                    sceneRef={sceneRef}
                    pid={plant.pid}
                    texture={plant.texture}
                    cost={plant.cost(pidToLevelMap.get(plant.pid) || 1)}
                    level={pidToLevelMap.get(plant.pid) || 1}
                />
            ))}
        </div>);
}
