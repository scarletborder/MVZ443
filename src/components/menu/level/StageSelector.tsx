// src/components/StageSelector.tsx
import React from 'react';
import { ChapterDataRecords, StageDataRecords } from '../../../game/utils/loader';
import { useSaveManager } from '../../../context/save_ctx';
import { publicUrl } from '../../../utils/browser';
import { useLocaleMessages } from '../../../hooks/useLocaleMessages';
import { stageKey } from '../../../i18n/keys';
import { useSetState, useLocalStorageState, useMount, useMemoizedFn } from 'ahooks';

interface StageSelectorProps {
    chapterId: number;
    onSelect: (stageId: number) => void;
    onBack: () => void;
}

const StageSelector: React.FC<StageSelectorProps> = ({ chapterId, onSelect, onBack }) => {
    const [state, setState] = useSetState({
        selectedStage: null as number | null,
        stagesIds: [] as number[],
    });

    // 使用 useLocalStorageState 保存用户选择的关卡
    const [stageSelection, setStageSelection] = useLocalStorageState('stageSelection', {
        defaultValue: {
            lastSelectedStage: null as number | null,
            lastChapterId: null as number | null,
        }
    });

    const saveManager = useSaveManager();
    const { translate } = useLocaleMessages();

    // 计算可用关卡
    const calculateAvailableStages = useMemoizedFn(() => {
        const chapterStages = ChapterDataRecords[chapterId]?.stages || [];
        const tmpStagesIds: number[] = [];
        for (const stageId of chapterStages) {
            if (saveManager.currentProgress.level.has(stageId)) {
                tmpStagesIds.push(stageId);
            }
        }
        return tmpStagesIds.sort((a, b) => a - b);
    });

    // 初始化可用关卡
    useMount(() => {
        const stages = calculateAvailableStages();
        setState({ stagesIds: stages });
        
        // 恢复上次选择的关卡（如果是在同一章节）
        if (stageSelection.lastChapterId === chapterId && 
            stageSelection.lastSelectedStage && 
            stages.includes(stageSelection.lastSelectedStage)) {
            setState({ selectedStage: stageSelection.lastSelectedStage });
        }
    });

    const handleStageSelect = useMemoizedFn((stageId: number) => {
        setState({ selectedStage: stageId });
        setStageSelection({ 
            lastSelectedStage: stageId,
            lastChapterId: chapterId 
        });
    });

    const handleNext = useMemoizedFn(() => {
        if (state.selectedStage) {
            onSelect(state.selectedStage);
        }
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
        }}>
            {/* 左侧 25% - 关卡选择 */}
            <div style={{
                width: '25%',
                height: '100%',
                position: 'absolute',
                left: 0,
                top: 0,
                background: 'rgba(20, 20, 20, 0.85)',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: '#666 #333',
            }}>
                <button
                    className='backbutton'
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #00ccff';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.boxShadow = 'inset 0 0 0 2px rgba(100, 100, 100, 0.3)';
                    }}
                    onClick={onBack}
                >
                    {translate('menu.back')}
                </button>
                {state.stagesIds.map((stageId) => (
                    <button
                        key={stageId}
                        className='menubutton'
                        style={{
                            background: state.selectedStage === stageId ? 'rgba(255, 255, 255, 0.1)' : 'none',
                            boxShadow: state.selectedStage === stageId
                                ? 'inset 0 0 0 2px #00ccff'
                                : 'inset 0 0 0 2px rgba(100, 100, 100, 0.3)',
                        }}
                        onMouseOver={(e) => {
                            if (state.selectedStage !== stageId) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #00ccff';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (state.selectedStage !== stageId) {
                                e.currentTarget.style.background = 'none';
                                e.currentTarget.style.boxShadow = 'inset 0 0 0 2px rgba(100, 100, 100, 0.3)';
                            }
                        }}
                        onClick={() => handleStageSelect(stageId)}
                    >
                        {translate(stageKey(StageDataRecords[stageId].nameKey))}
                    </button>
                ))}
            </div>

            {/* 右侧 70% - 关卡描述 */}
            <div style={{
                width: '70%',
                height: '94%',
                position: 'absolute',
                right: 0,
                top: 0,
                padding: '20px',
                color: '#ddd',
                overflowY: 'auto',
                background: 'rgba(30, 30, 30, 0.9)',
                scrollbarColor: '#666 #333',
            }}>
                {state.selectedStage ? <img
                    src={`${publicUrl}/assets/dramas/${StageDataRecords[state.selectedStage].illustration}`}
                    style={{
                        width: '100%',
                        height: 'auto',
                        marginBottom: '20px',
                    }}
                /> : null}
                {state.selectedStage ? translate(stageKey(StageDataRecords[state.selectedStage].descriptionKey)) : translate('menu.level_choose_level_tip')}
                {/* 下一步按钮 */}
                <br />
                <button
                    style={{
                        marginTop: 'auto',
                        width: '95%',
                        padding: '10px 20px',
                        background: state.selectedStage ? '#00ccff' : '#666',
                        border: 'none',
                        color: '#fff',
                        cursor: state.selectedStage ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease',
                    }}
                    disabled={!state.selectedStage}
                    onClick={handleNext}
                >
                    {translate('menu.next')}
                </button>
            </div>
        </div>
    );
};

export default StageSelector;
