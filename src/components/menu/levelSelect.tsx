// src/components/LevelSelector.tsx
import React from 'react';
import { GameParams } from '../../game/models/GameParams';
import ChapterSelector from './level/ChapterSelector';
import StageSelector from './level/StageSelector';
import ParamsSelector from './level/ParamsSelector';
import { StageDataRecords } from '../../game/utils/loader';
import BackendWS from '../../utils/net/sync';
import { OnlineStateManager } from '../../store/OnlineStateManager';
import { SendChooseMap, SendLeaveChooseMap } from '../../utils/net/room';
import EnumGameStage from '../../utils/net/game_state';
import { useSetState, useLocalStorageState, useMount } from 'ahooks';
import { useLocaleMessages } from '../../hooks/useLocaleMessages';

interface LevelSelectorProps {
    width: number;
    height: number;
    onBack: () => void;
    setGameParams: (params: GameParams) => void;
    startGame: () => void;
    skipToParams?: boolean;
    chosenStage?: number;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({
    setGameParams,
    startGame,
    width,
    height,
    onBack,
    skipToParams,
    chosenStage
}) => {
    const islord = BackendWS.isLord();
    const isOnlineMode = BackendWS.isOnlineMode();
    const onlineManager = OnlineStateManager.getInstance();
    const { translate } = useLocaleMessages();

    // 使用 useSetState 管理组件状态
    const [state, setState] = useSetState({
        currentStep: 'chapter' as 'chapter' | 'stage' | 'params',
        selectedChapterId: null as number | null,
        selectedStageId: null as number | null,
        isLoading: false, // 联机模式下的加载状态
        gameStage: EnumGameStage.InLobby, // 当前游戏阶段
        readyPlayerCount: 0, // 已准备的玩家数量
        totalPlayerCount: 0, // 总玩家数量
    });

    // 使用 useLocalStorageState 持久化选关状态
    const [levelSelectorState, setLevelSelectorState] = useLocalStorageState('levelSelectorState', {
        defaultValue: {
            lastChapterId: null as number | null,
            lastStageId: null as number | null,
            lastStep: 'chapter' as 'chapter' | 'stage' | 'params',
        }
    });

    // 清除选关相关的 localStorage（保留植物选择）
    const clearLevelSelection = () => {
        setLevelSelectorState({
            lastChapterId: null,
            lastStageId: null,
            lastStep: 'chapter'
        });
        // 清除章节和关卡选择，但保留植物选择
        localStorage.removeItem('chapterSelection');
        localStorage.removeItem('stageSelection');
    };

    // 处理返回操作，清除 localStorage
    const handleBackWithClear = () => {
        clearLevelSelection();
        onBack();
    };

    // 监听在线状态变化的 hook
    useMount(() => {
        if (isOnlineMode) {
            // 监听游戏阶段变化
            const handleGameStageChange = (gameStage: number) => {
                console.log('🎮 GameStage changed from', state.gameStage, 'to', gameStage, 'current step:', state.currentStep);
                setState({ gameStage });

                // 根据游戏阶段调整UI状态
                if (gameStage === EnumGameStage.Preparing) {
                    // 准备阶段，跳转到选卡界面
                    if (state.selectedChapterId && state.selectedStageId) {
                        setState({ currentStep: 'params' });
                    }
                } else if (gameStage === EnumGameStage.Loading) {
                    setState({ isLoading: true });
                } else if (gameStage === EnumGameStage.InLobby) {
                    // 只有在明确需要回到大厅时才重置状态
                    // 避免在准备阶段的状态更新导致误跳转
                    console.log('🔄 Received InLobby state, current step:', state.currentStep);
                    
                    // 如果当前在选卡界面，不要重置，除非明确是从游戏结束或房间关闭等情况
                    const shouldReset = state.currentStep !== 'params' || 
                                      state.gameStage === EnumGameStage.PostGame || 
                                      state.gameStage === EnumGameStage.InGame;
                    
                    if (shouldReset) {
                        console.log('🔄 Resetting to chapter selection');
                        setState({
                            currentStep: 'chapter',
                            isLoading: false,
                            selectedChapterId: null,
                            selectedStageId: null
                        });
                    } else {
                        console.log('🔄 Staying in current step to avoid unwanted jump');
                        setState({ isLoading: false });
                    }
                }
            };

            // 监听房间信息变化
            const handleRoomInfoChange = () => {
                const peersData = onlineManager.getRoomPeersData();
                setState({
                    totalPlayerCount: peersData ? peersData.length : 0
                });
            };

            onlineManager.onGameStageUpdate(handleGameStageChange);
            onlineManager.onRoomInfoUpdate(handleRoomInfoChange);

            // 初始化状态
            setState({
                gameStage: onlineManager.getCurrentGameStage(),
                totalPlayerCount: onlineManager.getPlayerCount()
            });

            return () => {
                onlineManager.removeGameStageUpdateListener(handleGameStageChange);
                onlineManager.removeRoomInfoUpdateListener(handleRoomInfoChange);
            };
        }
    });

    const handleBack = () => {
        // 选择章节中的细分地图
        if (state.currentStep === 'stage') {
            setState({ currentStep: 'chapter' });
            setLevelSelectorState({
                lastChapterId: levelSelectorState?.lastChapterId || null,
                lastStageId: levelSelectorState?.lastStageId || null,
                lastStep: 'chapter'
            });
        }

        // 选卡（preparing阶段）
        if (state.currentStep === 'params') {
            setState({ currentStep: 'stage' });
            setLevelSelectorState({
                lastChapterId: levelSelectorState?.lastChapterId || null,
                lastStageId: levelSelectorState?.lastStageId || null,
                lastStep: 'stage'
            });
        }
    };

    const handleChapterSelect = (chapterId: number) => {
        setState({
            selectedChapterId: chapterId,
            currentStep: 'stage'
        });
        setLevelSelectorState({
            lastChapterId: chapterId,
            lastStageId: levelSelectorState?.lastStageId || null,
            lastStep: 'stage'
        });
    };

    const handleStageSelect = (stageId: number) => {
        setState({
            selectedStageId: stageId,
            currentStep: 'params'
        });
        setLevelSelectorState({
            lastChapterId: levelSelectorState?.lastChapterId || null,
            lastStageId: stageId,
            lastStep: 'params'
        });

        // 联机模式下房主发送选图消息
        if (isOnlineMode && islord) {
            console.log("房主发送选图消息: stageId =", stageId);
            const chapterId = StageDataRecords[stageId]?.chapterID || 1;
            SendChooseMap(chapterId, stageId);
        }
    };

    const handleParamsBack = () => {
        // 联机模式下房主发送离开选图消息
        if (isOnlineMode && islord) {
            SendLeaveChooseMap();
        }
        handleBack();
    };

    // 判断是否可以进行下一步操作（联机模式下的权限限制）
    const canProceedToNextStep = () => {
        if (!isOnlineMode) {
            return true; // 单机模式无限制
        }

        // 联机模式下的限制
        if (state.currentStep === 'stage' && !islord) {
            // 普通玩家无法点击关卡选择时候的'下一步'
            return false;
        }

        return true;
    };

    // 获取按钮显示文本
    const getButtonText = () => {
        if (state.isLoading) {
            return translate('loading') || '加载中...';
        }

        if (isOnlineMode && state.gameStage === EnumGameStage.Preparing) {
            if (state.currentStep === 'params') {
                return islord ? (translate('confirm') || '确认') : (translate('ready') || '准备');
            }
        }

        return translate('next') || '下一步';
    };

    // 获取按钮状态样式
    const getButtonStyle = () => {
        const baseStyle = {
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            minWidth: '120px',
        };

        if (state.isLoading || !canProceedToNextStep()) {
            return {
                ...baseStyle,
                background: '#666',
                color: '#ccc',
                cursor: 'not-allowed',
            };
        }

        return {
            ...baseStyle,
            background: 'linear-gradient(45deg, #4CAF50, #45a049)',
            color: 'white',
        };
    };

    // 初始化时清除 localStorage（除非是 skipToParams）
    useMount(() => {
        if (skipToParams && chosenStage) {
            const chapterId = StageDataRecords[chosenStage].chapterID;
            setState({
                selectedChapterId: chapterId,
                selectedStageId: chosenStage,
                currentStep: 'params'
            });
            setLevelSelectorState({
                lastChapterId: chapterId,
                lastStageId: chosenStage,
                lastStep: 'params'
            });
        } else {
            // 正常进入选关时，清除 localStorage
            clearLevelSelection();
        }
    });

    return (
        <div style={{
            width: `${width}px`,
            height: `${height}px`,
            background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
            position: "relative",
            overflow: "hidden",
            border: "2px solid #444",
            boxShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
            animation: "frameFadeIn 0.5s ease-out",
            whiteSpace: "pre-wrap"
        }}>
            {state.currentStep === 'chapter' && (
                <ChapterSelector
                    onSelect={handleChapterSelect}
                    onBack={handleBackWithClear}
                />
            )}
            {state.currentStep === 'stage' && state.selectedChapterId !== null && (
                <StageSelector
                    chapterId={state.selectedChapterId}
                    onSelect={handleStageSelect}
                    onBack={handleBack}
                />
            )}
            {state.currentStep === 'params' && state.selectedChapterId !== null && state.selectedStageId !== null && (
                <ParamsSelector
                    chapterId={state.selectedChapterId}
                    stageId={state.selectedStageId}
                    setGameParams={setGameParams}
                    startGame={startGame}
                    onBack={handleParamsBack}
                    clearLevelSelection={clearLevelSelection}
                    // 传递联机模式相关的 props
                    isOnlineMode={isOnlineMode}
                    islord={islord}
                    gameStage={state.gameStage}
                    isLoading={state.isLoading}
                    canProceed={canProceedToNextStep()}
                    buttonText={getButtonText()}
                    buttonStyle={getButtonStyle()}
                />
            )}
        </div>
    );
};

export default LevelSelector;
