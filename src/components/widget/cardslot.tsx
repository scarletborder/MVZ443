import { useEffect, useState } from 'react';
import { useMemoizedFn, useCreation } from 'ahooks';
import { IRefPhaserGame } from '../../game/PhaserGame';
import Card from './card';
import PlantFactoryMap from '../../game/presets/plant';
import { IRecord } from '../../game/models/IRecord';
import { useSaveManager } from '../../context/save_ctx';
import { GameParams } from '../../game/models/GameParams';
import VCard from './vcard';
import { useDeviceType } from '../../hooks/useDeviceType';
import Pickaxe from './pickaxe';
import useDarkMode from '../../hooks/useDarkMode';
import { EnergyDisplay } from './EnergyDisplay';

interface slotProps {
    sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
    gameParams: GameParams | null;
}

export function EnergySlot() {
    // 能量定时器配置 - 每25秒增加25能量，无首次延迟
    const energyTimerConfig = {
        timeInterval: 25000,
        energyDelta: 25,
        startDelay: 0
    };

    return (
        <EnergyDisplay
            direction="vertical"
            energyTimer={energyTimerConfig}
        />
    );
}


export function VerticalEnergySlot() {
    // 能量定时器配置 - 每25秒增加25能量，无首次延迟
    const energyTimerConfig = {
        timeInterval: 25000,
        energyDelta: 25,
        startDelay: 0
    };

    return (
        <EnergyDisplay
            direction="horizontal"
            energyTimer={energyTimerConfig}
        />
    );
}

export function CardSlotHorizontal({ sceneRef, gameParams }: slotProps) {
    const isDarkMode = useDarkMode();
    // PC 用主要卡槽
    const MaxCardNumber = 10;
    const { currentProgress } = useSaveManager();

    // 使用 useCreation 优化 Map 创建，避免每次渲染都创建新的 Map
    const [plants, setPlants] = useState<Array<IRecord>>([]);
    const [pidToLevelMap, setPidToLevelMap] = useState(() => new Map<number, number>());

    // 使用 useMemoizedFn 优化处理函数
    const updatePlantsAndLevels = useMemoizedFn(() => {
        if (!gameParams) {
            setPlants([]);
            setPidToLevelMap(new Map());
            return;
        }

        const newPlants: Array<IRecord> = gameParams.plants.slice(0, MaxCardNumber)
            .map(pid => PlantFactoryMap[pid])
            .filter(Boolean);

        setPlants(newPlants);

        const newPidToLevelMap = new Map<number, number>();
        currentProgress.plants.forEach(plant => {
            if (gameParams.plants.includes(plant.pid)) {
                newPidToLevelMap.set(plant.pid, plant.level);
            }
        });

        setPidToLevelMap(newPidToLevelMap);
    });

    useEffect(() => {
        updatePlantsAndLevels();
    }, [gameParams, currentProgress, updatePlantsAndLevels]);

    // 使用 useCreation 优化样式对象
    const containerStyle = useCreation(() => ({
        display: 'flex' as const,
        flexDirection: "row" as const,
        justifyContent: 'flex-start' as const,
        backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
        width: '100%',
        height: "100%",
        alignItems: "center" as const,
    }), [isDarkMode]);

    return (
        <div style={containerStyle}>
            {plants.map((plant, index) => (
                <Card
                    key={`${plant.pid}-${index}`} // 更好的 key
                    plantName={plant.nameKey}
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



export function CardSlotVertical({ sceneRef, gameParams }: slotProps) {
    const isDarkMode = useDarkMode();
    // Mobile 用主要卡槽
    const MaxCardNumber = 9;
    const { currentProgress } = useSaveManager();
    const [plants, setPlants] = useState<Array<IRecord>>([]);
    const [pidToLevelMap, setPidToLevelMap] = useState(() => new Map<number, number>());

    // 使用 useMemoizedFn 优化处理函数
    const updatePlantsAndLevels = useMemoizedFn(() => {
        if (!gameParams) {
            setPlants([]);
            setPidToLevelMap(new Map());
            return;
        }

        const newPlants: Array<IRecord> = gameParams.plants.slice(0, MaxCardNumber)
            .map(pid => PlantFactoryMap[pid])
            .filter(Boolean);

        setPlants(newPlants);

        const newPidToLevelMap = new Map<number, number>();
        currentProgress.plants.forEach(plant => {
            if (gameParams.plants.includes(plant.pid)) {
                newPidToLevelMap.set(plant.pid, plant.level);
            }
        });

        setPidToLevelMap(newPidToLevelMap);
    });

    useEffect(() => {
        updatePlantsAndLevels();
    }, [gameParams, currentProgress, updatePlantsAndLevels]);

    // 使用 useCreation 优化样式对象
    const containerStyle = useCreation(() => ({
        display: 'flex' as const,
        flexDirection: "column" as const,
        justifyContent: 'flex-start' as const,
        alignItems: 'flex-start' as const,
        width: '120%',
        height: "91%",
        backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
    }), [isDarkMode]);

    return (
        <div style={containerStyle}>
            {plants.map((plant, index) => (
                <VCard
                    key={`${plant.pid}-${index}`} // 更好的 key
                    plantName={plant.nameKey}
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
    const deviceType = useDeviceType();
    const ExistedCards = deviceType === 'pc' ? 10 : 9;
    const { currentProgress } = useSaveManager();
    const [plants, setPlants] = useState<Array<IRecord>>([]);
    const [pidToLevelMap, setPidToLevelMap] = useState(() => new Map<number, number>());

    // 使用 useMemoizedFn 优化处理函数
    const updatePlantsAndLevels = useMemoizedFn(() => {
        if (!gameParams) {
            setPlants([]);
            setPidToLevelMap(new Map());
            return;
        }

        if (gameParams.plants.length > ExistedCards) {
            const newPlants: Array<IRecord> = gameParams.plants.slice(ExistedCards)
                .map(pid => PlantFactoryMap[pid])
                .filter(Boolean);

            setPlants(newPlants);

            const newPidToLevelMap = new Map<number, number>();
            currentProgress.plants.forEach(plant => {
                if (gameParams.plants.includes(plant.pid)) {
                    newPidToLevelMap.set(plant.pid, plant.level);
                }
            });

            setPidToLevelMap(newPidToLevelMap);
        } else {
            setPlants([]);
            setPidToLevelMap(new Map());
        }
    });

    useEffect(() => {
        updatePlantsAndLevels();
    }, [gameParams, currentProgress, ExistedCards, updatePlantsAndLevels]);

    // 使用 useCreation 优化样式对象
    const containerStyle = useCreation(() => ({
        display: 'flex' as const,
        flexDirection: "row" as const,
        justifyContent: 'flex-start' as const,
        width: '100%',
        height: "100%",
        backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
    }), [isDarkMode]);

    return (
        <div style={containerStyle}>
            <Pickaxe sceneRef={sceneRef} />
            {plants.map((plant, index) => (
                <Card
                    key={`${plant.pid}-${index}`} // 更好的 key
                    plantName={plant.nameKey}
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
