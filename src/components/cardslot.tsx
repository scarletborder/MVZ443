import { useEffect } from 'react';
import { IRefPhaserGame } from '../game/PhaserGame';
import Card from './card';
import { PlantFactoryMap } from '../game/utils/loader';
import { useGameContext } from '../context/garden_ctx';
import { EventBus } from '../game/EventBus';
import { IRecord } from '../game/models/IRecord';
import { useSaveManager } from '../context/save_ctx';

interface slotProps {
    sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
}


export function EnergySlot({ sceneRef }: slotProps) {
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
            display: 'flex',
            flexDirection: "column",
            backgroundColor: '#f0f0f0',
            justifyContent: 'flex-end',
            width: '10%',
            height: "100%",
            alignItems: "center",
            color: 'black'
        }}>
            <p>Energy</p>
            <p>{energy}</p>
        </div>
    )
}

export function CardSlotHorizontal({ sceneRef }: slotProps) {
    // TODO:通过选关界面获得的植物信息
    // 这里获得了除了游戏内使用的函数以外的全部信息
    // energy使用情况也是从这里发出
    const pids = [1, 2, 3, 5];
    const plants: Array<IRecord> = [];

    const { currentProgress } = useSaveManager();

    const pidSet = new Set<number>();
    pids.forEach(pid => {
        pidSet.add(pid);
        plants.push(PlantFactoryMap[pid]);
    })
    // 使用 WeakMap 来记录 pid 到 level 的映射
    const pidToLevelMap = new Map<number, number>();

    currentProgress.plants.forEach(plant => {
        if (pidSet.has(plant.pid)) pidToLevelMap.set(plant.pid, plant.level);
    })

    let line_1 = 9// 第一行, 阳光显示 + 9个卡槽
    let line_2 = 9// 列, 铲子 + 9个卡槽

    return (<div style={{
        display: 'flex',
        flexDirection: "row",
        backgroundColor: '#f0f0f0',
        justifyContent: 'flex-start',
        width: '90%',
        height: "100%",
        alignItems: "center",
    }} >
        {plants.map((plant, index) => (
            <Card
                key={index}
                plantName={plant.name}
                cooldownTime={plant.cooldownTime}
                sceneRef={sceneRef}
                pid={plant.pid}
                texture={plant.texture}
                cost={plant.cost(pidToLevelMap.get(plant.pid) || 1)}
            />
        ))}
    </div>);
}

// export function CardSlotVertical({ scene }: slotProps) {
//     const plants = [
//         { name: '向日葵', cooldown: 7 },
//         { name: '豌豆射手', cooldown: 5 },
//         { name: '坚果', cooldown: 10 },
//         { name: '樱桃炸弹', cooldown: 15 },
//         { name: '向日葵2', cooldown: 7 },
//         { name: '豌豆射手2', cooldown: 5 },
//         { name: '坚果2', cooldown: 10 },
//         { name: '樱桃炸弹2', cooldown: 15 },
//         { name: '向日葵', cooldown: 7 },
//         { name: '豌豆射手', cooldown: 5 },
//         { name: '坚果', cooldown: 10 },
//         { name: '樱桃炸弹', cooldown: 15 },
//     ];

//     let line_1 = 9// 第一行, 阳光显示 + 9个卡槽
//     let line_2 = 9// 列, 铲子 + 9个卡槽

//     return (<div style={{
//         display: 'flex',
//         flexDirection: "column",
//         backgroundColor: '#f0f0f0',
//         justifyContent: 'flex-start',
//         width: '100%',
//         height: "100%",
//         alignItems: "center",
//     }}>
//         {plants.map((plant, index) => (
//             <Card
//                 key={index}
//                 plantName={plant.name}
//                 cooldownTime={plant.cooldown}
//             />
//         ))}
//     </div>);
// }