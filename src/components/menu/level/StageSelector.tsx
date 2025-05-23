// src/components/StageSelector.tsx
import React, { useEffect, useState } from 'react';
import { ChapterDataRecords, StageDataRecords } from '../../../game/utils/loader';
import { useSaveManager } from '../../../context/save_ctx';
import { publicUrl } from '../../../utils/browser';
import { useLocaleMessages } from '../../../hooks/useLocaleMessages';

interface StageSelectorProps {
    chapterId: number;
    onSelect: (stageId: number) => void;
    onBack: () => void;
}

const StageSelector: React.FC<StageSelectorProps> = ({ chapterId, onSelect, onBack }) => {
    const [selectedStage, setSelectedStage] = useState<number | null>(null);
    const [stagesIds, setStagesIds] = useState<number[]>([]);
    const saveManager = useSaveManager();
    const { translate } = useLocaleMessages();

    useEffect(() => {
        const chapterStages = ChapterDataRecords[chapterId]?.stages || [];
        const tmpStagesIds: number[] = [];
        for (const stageId of chapterStages) {
            if (saveManager.currentProgress.level.has(stageId)) {
                tmpStagesIds.push(stageId);
            }
        }
        tmpStagesIds.sort((a, b) => a - b);
        setStagesIds(tmpStagesIds);
    }, []);

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
                    {translate('menu_back')}
                </button>
                {stagesIds.map((stageId) => (
                    <button
                        key={stageId}
                        className='menubutton'
                        style={{

                            background: selectedStage === stageId ? 'rgba(255, 255, 255, 0.1)' : 'none',

                            boxShadow: selectedStage === stageId
                                ? 'inset 0 0 0 2px #00ccff'
                                : 'inset 0 0 0 2px rgba(100, 100, 100, 0.3)',
                        }}
                        onMouseOver={(e) => {
                            if (selectedStage !== stageId) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #00ccff';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (selectedStage !== stageId) {
                                e.currentTarget.style.background = 'none';
                                e.currentTarget.style.boxShadow = 'inset 0 0 0 2px rgba(100, 100, 100, 0.3)';
                            }
                        }}
                        onClick={() => setSelectedStage(stageId)}
                    >
                        {translate(StageDataRecords[stageId].nameKey)}
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
                {selectedStage ? <img
                    src={`${publicUrl}/assets/dramas/${StageDataRecords[selectedStage].illustration}`}
                    style={{
                        width: '100%',
                        height: 'auto',
                        marginBottom: '20px',
                    }}
                /> : null}
                {selectedStage ? translate(StageDataRecords[selectedStage].descriptionKey) : translate('menu_level_choose_level_tip')}
                {/* 下一步按钮 */}
                <br />
                <button
                    style={{
                        marginTop: 'auto',
                        width: '95%',
                        padding: '10px 20px',
                        background: selectedStage ? '#00ccff' : '#666',
                        border: 'none',
                        color: '#fff',
                        cursor: selectedStage ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease',
                    }}
                    disabled={!selectedStage}
                    onClick={() => selectedStage && onSelect(selectedStage)}
                >
                    {translate('menu_next')}
                </button>
            </div>


        </div>
    );
};

export default StageSelector;
