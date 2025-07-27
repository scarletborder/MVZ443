// src/components/LevelSelector.tsx
import React from 'react';
import { GameParams } from '../../game/models/GameParams';
import ChapterSelector from './level/ChapterSelector';
import StageSelector from './level/StageSelector';
import ParamsSelector from './level/ParamsSelector';
import { StageDataRecords } from '../../game/utils/loader';
import BackendWS from '../../utils/net/sync';
import encodeMessageToBinary from '../../utils/net/encode';
import { useSetState, useLocalStorageState, useMount, useUpdateEffect } from 'ahooks';

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
    
    // 使用 useSetState 管理组件状态
    const [state, setState] = useSetState({
        currentStep: 'chapter' as 'chapter' | 'stage' | 'params',
        selectedChapterId: null as number | null,
        selectedStageId: null as number | null,
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

    const handleBack = () => {
        if (state.currentStep === 'stage') {
            setState({ currentStep: 'chapter' });
            setLevelSelectorState(prev => ({ ...prev, lastStep: 'chapter' }));
        }
        if (state.currentStep === 'params') {
            setState({ currentStep: 'stage' });
            setLevelSelectorState(prev => ({ ...prev, lastStep: 'stage' }));
        }
    };

    const handleChapterSelect = (chapterId: number) => {
        setState({ 
            selectedChapterId: chapterId, 
            currentStep: 'stage' 
        });
        setLevelSelectorState(prev => ({ 
            ...prev, 
            lastChapterId: chapterId, 
            lastStep: 'stage' 
        }));
    };

    const handleStageSelect = (stageId: number) => {
        setState({ 
            selectedStageId: stageId, 
            currentStep: 'params' 
        });
        setLevelSelectorState(prev => ({ 
            ...prev, 
            lastStageId: stageId, 
            lastStep: 'params' 
        }));
        
        if (islord) {
            console.log("send message map");
            BackendWS.send(encodeMessageToBinary({
                type: 0x10,
                chapterId: stageId
            }));
        }
    };

    const handleParamsBack = () => {
        if (islord) {
            BackendWS.sendMessage(JSON.stringify({
                type: 0x10,
                chapterId: 0
            }));
        }
        handleBack();
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

    // 监听网络消息
    useMount(() => {
        const chapterJumpHandler = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.type === 0x00 && !islord) {
                const chapterID = data.chapterId;
                if (chapterID === 0) {
                    console.log('get back');
                    handleBackWithClear();
                }
            }
        };
        
        BackendWS.addMessageListener(chapterJumpHandler);
        return () => {
            BackendWS.delMessageListener(chapterJumpHandler);
        };
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
                />
            )}
        </div>
    );
};

export default LevelSelector;
