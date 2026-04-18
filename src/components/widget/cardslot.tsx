import { useEffect, useState } from 'react';
import { useMemoizedFn, useCreation } from 'ahooks';
import { IRefPhaserGame } from '../../game/PhaserGame';
import Card from './card';
import { useSaveManager } from '../../context/save_ctx';
import { GameParams } from '../../game/models/GameParams';
import VCard from './vcard';
import { useDeviceType } from '../../hooks/useDeviceType';
import Pickaxe from './pickaxe';
import useDarkMode from '../../hooks/useDarkMode';
import { EnergyDisplay } from './EnergyDisplay';
import { PlantModel } from '../../game/models/PlantModel';
import { PlantLibrary } from '../../game/managers/library/PlantLibrary';

interface slotProps {
  sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
  gameParams: GameParams | null;
}

export function EnergySlot() {
  return (
    <EnergyDisplay
      direction="vertical"
    />
  );
}


export function VerticalEnergySlot() {
  return (
    <EnergyDisplay
      direction="horizontal"
    />
  );
}

export function CardSlotHorizontal({ sceneRef, gameParams }: slotProps) {
  const isDarkMode = useDarkMode();
  // PC 用主要卡槽
  const MaxCardNumber = 10;
  const { currentProgress } = useSaveManager();

  // 使用 useCreation 优化 Map 创建，避免每次渲染都创建新的 Map
  const [plants, setPlants] = useState<Array<PlantModel>>([]);
  const [pidToLevelMap, setPidToLevelMap] = useState(() => new Map<number, number>());

  // 使用 useMemoizedFn 优化处理函数
  const updatePlantsAndLevels = useMemoizedFn(() => {
    if (!gameParams) {
      setPlants([]);
      setPidToLevelMap(new Map());
      return;
    }
    const newPlants: Array<PlantModel> = [];
    const chosenPids = gameParams.plants.slice(0, MaxCardNumber);
    for (const pid of chosenPids) {
      const plantModel = PlantLibrary.GetModel(pid);
      if (!plantModel) {
        console.warn(`Plant model not found for pid ${pid}`);
      } else {
        newPlants.push(plantModel);
      }
    }

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
      {plants.map((plantModel, index) => (
        <Card
          key={`${plantModel.pid}-${index}`} // 更好的 key
          sceneRef={sceneRef}
          level={pidToLevelMap.get(plantModel.pid) || 1}
          plantModel={plantModel}
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
  const [plants, setPlants] = useState<Array<PlantModel>>([]);
  const [pidToLevelMap, setPidToLevelMap] = useState(() => new Map<number, number>());

  // 使用 useMemoizedFn 优化处理函数
  const updatePlantsAndLevels = useMemoizedFn(() => {
    if (!gameParams) {
      setPlants([]);
      setPidToLevelMap(new Map());
      return;
    }

    const newPlants: Array<PlantModel> = [];
    const chosenPids = gameParams.plants.slice(0, MaxCardNumber);
    for (const pid of chosenPids) {
      const plantModel = PlantLibrary.GetModel(pid);
      if (!plantModel) {
        console.warn(`Plant model not found for pid ${pid}`);
      } else {
        newPlants.push(plantModel);
      }
    }

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
      {plants.map((plantModel, index) => (
        <VCard
          key={`${plantModel.pid}-${index}`} // 更好的 key
          sceneRef={sceneRef}
          level={pidToLevelMap.get(plantModel.pid) || 1}
          plantModel={plantModel}
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
  const [plants, setPlants] = useState<Array<PlantModel>>([]);
  const [pidToLevelMap, setPidToLevelMap] = useState(() => new Map<number, number>());

  // 使用 useMemoizedFn 优化处理函数
  const updatePlantsAndLevels = useMemoizedFn(() => {
    if (!gameParams) {
      setPlants([]);
      setPidToLevelMap(new Map());
      return;
    }

    if (gameParams.plants.length > ExistedCards) {
      const newPlants: Array<PlantModel> = [];
      const chosenPids = gameParams.plants.slice(ExistedCards);
      for (const pid of chosenPids) {
        const plantModel = PlantLibrary.GetModel(pid);
        if (!plantModel) {
          console.warn(`Plant model not found for pid ${pid}`);
        } else {
          newPlants.push(plantModel);
        }
      }

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
      {plants.map((plantModel, index) => (
        <Card
          key={`${plantModel.pid}-${index}`} // 更好的 key
          sceneRef={sceneRef}
          level={pidToLevelMap.get(plantModel.pid) || 1}
          plantModel={plantModel}
        />
      ))}
    </div>
  );
}
