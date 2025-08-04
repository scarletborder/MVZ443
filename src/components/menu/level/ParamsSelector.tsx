// src/components/ParamsSelector.tsx
import React, { useEffect } from 'react';
import { GameParams } from '../../../game/models/GameParams';
import { useSaveManager } from '../../../context/save_ctx';
import { StageDataRecords } from '../../../game/utils/loader';
import PlantFactoryMap from '../../../game/presets/plant';
import { publicUrl } from '../../../utils/browser';
import { useSettings } from '../../../context/settings_ctx';
import { useLocaleMessages } from '../../../hooks/useLocaleMessages';
import { useSetState, useLocalStorageState, useMount, useMemoizedFn } from 'ahooks';
import { SendReady } from '../../../utils/net/room';
import { EventBus } from '../../../game/EventBus';

interface ParamsSelectorProps {
  chapterId: number;
  stageId: number;
  setGameParams: (params: GameParams) => void;
  startGame: () => void;
  onBack: () => void;
  clearLevelSelection: () => void;
  // 联机模式相关属性
  isOnlineMode?: boolean;
  islord?: boolean;
  gameStage?: number;
  isLoading?: boolean;
  canProceed?: boolean;
  buttonText?: string;
  buttonStyle?: React.CSSProperties;
}

interface PlantElem {
  pid: number;
  name: string;
  imgUrl: string;
  level: number;
}

const ParamsSelector: React.FC<ParamsSelectorProps> = ({
  stageId,
  setGameParams,
  startGame,
  onBack,
  clearLevelSelection,
  // 联机模式相关属性
  isOnlineMode = false,
  islord = false,
  gameStage,
  isLoading = false,
  canProceed = true,
  buttonText,
  buttonStyle
}) => {
  const [state, setState] = useSetState({
    selectedPlants: [] as number[],
    availablePlants: [] as PlantElem[],
    isOverLimit: false,
    selectUpperLimit: 0,
    // 联机模式的准备状态
    readyPlayerCount: 0,
    totalPlayerCount: 0,
    hasUserClicked: false, // 跟踪用户是否已经点击了准备按钮
  });

  // 使用 useLocalStorageState 保存用户选择的植物配置
  const [plantSelection, setPlantSelection] = useLocalStorageState('plantSelection', {
    defaultValue: {
      lastSelectedPlants: [] as number[],
      lastStageId: null as number | null
    }
  });

  const settings = useSettings();
  const saveManager = useSaveManager();
  const { translate } = useLocaleMessages();

  // 联机模式下监听准备状态更新
  useEffect(() => {
    if (!isOnlineMode) return;

    const handleReadyCountUpdate = (event: { readyCount: number; totalPlayers: number }) => {
      setState({
        readyPlayerCount: event.readyCount,
        totalPlayerCount: event.totalPlayers
      });
    };

    const handleQuitChooseMap = () => {
      // 房主取消了选图，重置用户点击状态
      setState({ hasUserClicked: false });
    };

    EventBus.on('room-update-ready-count', handleReadyCountUpdate);
    EventBus.on('room-quit-choose-map', handleQuitChooseMap);

    return () => {
      EventBus.off('room-update-ready-count', handleReadyCountUpdate);
      EventBus.off('room-quit-choose-map', handleQuitChooseMap);
    };
  }, [isOnlineMode]);

  // 计算可用植物
  const calculateAvailablePlants = useMemoizedFn(() => {
    const plantProgress = saveManager.currentProgress.plants;
    if (!plantProgress || plantProgress.length < 1) {
      console.log("No plant progress available:", saveManager.currentProgress);
      return [];
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
        name: translate(plantObj.nameKey),
        imgUrl: `${publicUrl}/assets/card/${plantObj.texture}.png`,
        level: plantProgress[i].level
      };
      newAvailablePlants.push(newPlant);
    }
    return newAvailablePlants.sort((a, b) => a.pid - b.pid);
  });

  // 初始化植物选择（不立即加载 localStorage）
  useMount(() => {
    const plants = calculateAvailablePlants();
    const upperLimit = saveManager.currentProgress.slotNum;

    setState({
      availablePlants: plants,
      selectUpperLimit: upperLimit
    });

    // 不立即恢复上次选择的植物，让用户手动选择
  });

  // 重选上次的植物配置
  const handleReloadLastSelection = useMemoizedFn(() => {
    if (plantSelection.lastStageId === stageId && plantSelection.lastSelectedPlants.length > 0) {
      const plants = state.availablePlants;
      const upperLimit = state.selectUpperLimit;
      const validPlants = plantSelection.lastSelectedPlants.filter(pid =>
        plants.some(p => p.pid === pid)
      );
      if (validPlants.length <= upperLimit) {
        setState({ selectedPlants: validPlants });
      }
    }
  });

  const handlePlantToggle = useMemoizedFn((pid: number) => {
    setState(prevState => {
      if (prevState.selectedPlants.includes(pid)) {
        // 取消选择植物
        const newSelectedPlants = prevState.selectedPlants.filter(p => p !== pid);
        return {
          ...prevState,
          selectedPlants: newSelectedPlants,
          isOverLimit: false
        };
      } else {
        // 选择植物
        if (prevState.selectedPlants.length >= prevState.selectUpperLimit) {
          setState({ isOverLimit: true });
          setTimeout(() => setState({ isOverLimit: false }), 400);
          return prevState;
        }
        const newSelectedPlants = [...prevState.selectedPlants, pid];
        return {
          ...prevState,
          selectedPlants: newSelectedPlants
        };
      }
    });
  });

  const handleStart = useMemoizedFn(() => {
    // 联机模式下的特殊处理
    if (isOnlineMode) {
      // 标记用户已经点击了准备按钮
      setState({ hasUserClicked: true });

      // 在线模式下，房主和普通玩家都需要设置GameParams
      const params: GameParams = {
        level: stageId,
        plants: state.selectedPlants,
        gameExit: () => { console.log('no gameexit Implemented') },
        gameSettings: {
          isBluePrint: settings.isBluePrint,
          isDebug: settings.isDebug,
          isBgm: settings.isBgm,
          isSoundAudio: settings.isSoundAudio,
        }
      };

      // 保存植物选择到 localStorage
      setPlantSelection({
        lastSelectedPlants: state.selectedPlants,
        lastStageId: stageId
      });

      // 清除选关相关的 localStorage
      clearLevelSelection();
      setGameParams(params);

      if (islord) {
        console.log("房主发送准备信号");
        SendReady(true); // 房主发送准备请求
      } else {
        console.log("玩家发送准备信号");
        SendReady(true); // 发送准备请求到服务器
      }

      return;
    }

    // 单机模式的原有逻辑
    const params: GameParams = {
      level: stageId,
      plants: state.selectedPlants,
      gameExit: () => { console.log('no gameexit Implemented') },
      gameSettings: {
        isBluePrint: settings.isBluePrint,
        isDebug: settings.isDebug,
        isBgm: settings.isBgm,
        isSoundAudio: settings.isSoundAudio,
      }
    };

    // 游戏开始时保存植物选择到 localStorage
    setPlantSelection({
      lastSelectedPlants: state.selectedPlants,
      lastStageId: stageId
    });

    // 清除选关相关的 localStorage
    clearLevelSelection();

    setGameParams(params);
    startGame();
  });

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
      {/* Left side - Plant selection */}
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
            {translate('menu_back')}
          </button>

          {/* 联机模式状态显示 */}
          {isOnlineMode && (
            <div style={{
              marginLeft: '16px',
              padding: '6px 12px',
              background: 'rgba(0, 200, 255, 0.2)',
              border: '1px solid rgba(0, 200, 255, 0.5)',
              borderRadius: '4px',
              color: '#00ccff',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {islord ? '房主模式' : '玩家模式'} | {
                state.hasUserClicked ? 
                  `等待其他玩家 (${state.readyPlayerCount}/${state.totalPlayerCount})` :
                  isLoading ? '等待中...' :
                    !canProceed ? '请等待房主操作' :
                      gameStage === 0x21 ? '准备阶段' : '可以操作'
              }
            </div>
          )}
          <div style={{
            marginLeft: '10px',
            color: '#ddd',
            fontSize: '16px'
          }}>
            {`stage ${stageId} - ${translate(StageDataRecords[stageId].nameKey)}`}
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          justifyContent: 'flex-start'
        }}>
          {state.availablePlants.map((plant) => (
            <div
              key={plant.pid}
              style={{
                width: '11.5%',
                aspectRatio: '1 / 1.5',
                border: state.selectedPlants.includes(plant.pid)
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
                if (!state.selectedPlants.includes(plant.pid))
                  e.currentTarget.style.borderColor = '#00ccff';
              }}
              onMouseOut={(e) => {
                if (!state.selectedPlants.includes(plant.pid))
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
                {translate(plant.name)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Parameters and selected plants */}
      <div style={{
        width: '40%',
        height: '100%',
        padding: '20px',
        color: '#ddd',
        background: 'rgba(30, 30, 30, 0.9)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px'
        }}>
          <h3>
            {`${translate('menu_level_chosen_plants')} `}
            <span style={{
              color: state.isOverLimit ? 'red' : '#ddd',
              transition: 'color 0.3s ease'
            }}>
              {`${state.selectedPlants.length}/${state.selectUpperLimit}`}
            </span>
          </h3>
          {plantSelection.lastStageId === stageId && plantSelection.lastSelectedPlants.length > 0 && (
            <button
              style={{
                padding: '4px 8px',
                background: '#4CAF50',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                borderRadius: '4px',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#45a049';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#4CAF50';
              }}
              onClick={handleReloadLastSelection}
            >
              重选上次
            </button>
          )}
        </div>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: '80%',
          scrollbarColor: '#888 #333',
        }}>
          {state.selectedPlants.map(pid => {
            const plant = state.availablePlants.find(p => p.pid === pid);
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
                <span style={{ marginLeft: '10px' }}>{translate(plant.name)}</span>
              </div>
            );
          })}
        </div>

        <button
          style={buttonStyle || {
            padding: '3% 40%',
            background: (canProceed && !(isOnlineMode && state.hasUserClicked)) ? '#00ccff' : '#666',
            border: 'none',
            color: (canProceed && !(isOnlineMode && state.hasUserClicked)) ? '#fff' : '#ccc',
            cursor: (canProceed && !(isOnlineMode && state.hasUserClicked)) ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            alignSelf: 'center'
          }}
          onClick={(canProceed && !(isOnlineMode && state.hasUserClicked)) ? handleStart : undefined}
          disabled={!canProceed || isLoading || (isOnlineMode && state.hasUserClicked)}
        >
          {isLoading && (
            <span style={{ marginRight: '8px' }}>⏳</span>
          )}
          {(isOnlineMode && state.hasUserClicked) ? 
            `等待其他玩家 (${state.readyPlayerCount}/${state.totalPlayerCount})` :
            (buttonText || translate('start'))
          }
        </button>
      </div>
    </div>
  );
};

export default ParamsSelector;
