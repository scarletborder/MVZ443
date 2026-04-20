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

    // 浣跨敤 useSetState 绠＄悊缁勪欢鐘舵€?
    const [state, setState] = useSetState({
        currentStep: 'chapter' as 'chapter' | 'stage' | 'params',
        selectedChapterId: null as number | null,
        selectedStageId: null as number | null,
        isLoading: false, // 鑱旀満妯″紡涓嬬殑鍔犺浇鐘舵€?
        gameStage: EnumGameStage.InLobby, // 褰撳墠娓告垙闃舵
        readyPlayerCount: 0, // 宸插噯澶囩殑鐜╁鏁伴噺
        totalPlayerCount: 0, // 鎬荤帺瀹舵暟閲?
    });

    // 浣跨敤 useLocalStorageState 鎸佷箙鍖栭€夊叧鐘舵€?
    const [levelSelectorState, setLevelSelectorState] = useLocalStorageState('levelSelectorState', {
        defaultValue: {
            lastChapterId: null as number | null,
            lastStageId: null as number | null,
            lastStep: 'chapter' as 'chapter' | 'stage' | 'params',
        }
    });

    // 娓呴櫎閫夊叧鐩稿叧鐨?localStorage锛堜繚鐣欐鐗╅€夋嫨锛?
    const clearLevelSelection = () => {
        setLevelSelectorState({
            lastChapterId: null,
            lastStageId: null,
            lastStep: 'chapter'
        });
        // 娓呴櫎绔犺妭鍜屽叧鍗￠€夋嫨锛屼絾淇濈暀妞嶇墿閫夋嫨
        localStorage.removeItem('chapterSelection');
        localStorage.removeItem('stageSelection');
    };

    // 澶勭悊杩斿洖鎿嶄綔锛屾竻闄?localStorage
    const handleBackWithClear = () => {
        clearLevelSelection();
        onBack();
    };

    // 统一监听房间阶段变化，mock 单人房也需要经过完整状态流转。
    useMount(() => {
        const handleGameStageChange = (gameStage: number) => {
            console.log('馃幃 GameStage changed from', state.gameStage, 'to', gameStage, 'current step:', state.currentStep);
            setState({ gameStage });

            // 鏍规嵁娓告垙闃舵璋冩暣UI鐘舵€?
            if (gameStage === EnumGameStage.Preparing) {
                // 鍑嗗闃舵锛岃烦杞埌閫夊崱鐣岄潰
                if (state.selectedChapterId && state.selectedStageId) {
                    setState({ currentStep: 'params' });
                }
            } else if (gameStage === EnumGameStage.Loading) {
                setState({ isLoading: true });
            } else if (gameStage === EnumGameStage.InLobby) {
                // 鍙湁鍦ㄦ槑纭渶瑕佸洖鍒板ぇ鍘呮椂鎵嶉噸缃姸鎬?
                // 閬垮厤鍦ㄥ噯澶囬樁娈电殑鐘舵€佹洿鏂板鑷磋璺宠浆
                console.log('馃攧 Received InLobby state, current step:', state.currentStep);

                // 濡傛灉褰撳墠鍦ㄩ€夊崱鐣岄潰锛屼笉瑕侀噸缃紝闄ら潪鏄庣‘鏄粠娓告垙缁撴潫鎴栨埧闂村叧闂瓑鎯呭喌
                const shouldReset = state.currentStep !== 'params' ||
                                  state.gameStage === EnumGameStage.PostGame ||
                                  state.gameStage === EnumGameStage.InGame;

                if (shouldReset) {
                    console.log('馃攧 Resetting to chapter selection');
                    setState({
                        currentStep: 'chapter',
                        isLoading: false,
                        selectedChapterId: null,
                        selectedStageId: null
                    });
                } else {
                    console.log('馃攧 Staying in current step to avoid unwanted jump');
                    setState({ isLoading: false });
                }
            } else if (gameStage === EnumGameStage.InGame) {
                setState({ isLoading: false });
            }
        };

        // 鐩戝惉鎴块棿淇℃伅鍙樺寲
        const handleRoomInfoChange = () => {
            const peersData = onlineManager.getRoomPeersData();
            setState({
                totalPlayerCount: peersData ? peersData.length : 0
            });
        };

        onlineManager.onGameStageUpdate(handleGameStageChange);
        onlineManager.onRoomInfoUpdate(handleRoomInfoChange);

        // 鍒濆鍖栫姸鎬?
        setState({
            gameStage: onlineManager.getCurrentGameStage(),
            totalPlayerCount: onlineManager.getPlayerCount()
        });

        return () => {
            onlineManager.removeGameStageUpdateListener(handleGameStageChange);
            onlineManager.removeRoomInfoUpdateListener(handleRoomInfoChange);
        };
    });

    const handleBack = () => {
        // 閫夋嫨绔犺妭涓殑缁嗗垎鍦板浘
        if (state.currentStep === 'stage') {
            setState({ currentStep: 'chapter' });
            setLevelSelectorState({
                lastChapterId: levelSelectorState?.lastChapterId || null,
                lastStageId: levelSelectorState?.lastStageId || null,
                lastStep: 'chapter'
            });
        }

        // 閫夊崱锛坧reparing闃舵锛?
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

        // 鑱旀満妯″紡涓嬫埧涓诲彂閫侀€夊浘娑堟伅
        if (isOnlineMode && islord) {
            console.log("鎴夸富鍙戦€侀€夊浘娑堟伅: stageId =", stageId);
            const chapterId = StageDataRecords[stageId]?.chapterID || 1;
            SendChooseMap(chapterId, stageId);
        }
    };

    const handleParamsBack = () => {
        // 鑱旀満妯″紡涓嬫埧涓诲彂閫佺寮€閫夊浘娑堟伅
        if (isOnlineMode && islord) {
            SendLeaveChooseMap();
        }
        handleBack();
    };

    // 鍒ゆ柇鏄惁鍙互杩涜涓嬩竴姝ยู搷浣滐紙鑱旀満妯″紡涓嬬殑鏉冮檺闄愬埗锛?
    const canProceedToNextStep = () => {
        if (!isOnlineMode) {
            return true; // 鍗曟満妯″紡鏃犻檺鍒?
        }

        // 鑱旀満妯″紡涓嬬殑闄愬埗
        if (state.currentStep === 'stage' && !islord) {
            // 鏅€氱帺瀹舵棤娉曠偣鍑诲叧鍗￠€夋嫨鏃跺€欑殑'涓嬩竴姝?
            return false;
        }

        return true;
    };

    // 鑾峰彇鎸夐挳鏄剧ず鏂囨湰
    const getButtonText = () => {
        if (state.isLoading) {
            return translate('loading') || '鍔犺浇涓?..';
        }

        if (isOnlineMode && state.gameStage === EnumGameStage.Preparing) {
            if (state.currentStep === 'params') {
                return islord ? (translate('confirm') || '纭') : (translate('ready') || '鍑嗗');
            }
        }

        return translate('next') || '涓嬩竴姝?';
    };

    // 鑾峰彇鎸夐挳鐘舵€佹牱寮?
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

    // 鍒濆鍖栨椂娓呴櫎 localStorage锛堥櫎闈炴槸 skipToParams锛?
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
            // 姝ｅ父杩涘叆閫夊叧鏃讹紝娓呴櫎 localStorage
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
                    // 浼犻€掕仈鏈烘ā寮忕浉鍏崇殑 props
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
