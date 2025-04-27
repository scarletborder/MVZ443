// src/components/ChapterSelector.tsx
import React, { useEffect, useState } from 'react';
import { ChapterDataRecords, StageDataRecords } from '../../../game/utils/loader';
import { useSaveManager } from '../../../context/save_ctx';
import { useLocaleMessages } from '../../../hooks/useLocaleMessages';



interface ChapterSelectorProps {
    onSelect: (chapterId: number) => void;
    onBack: () => void;
}

const ChapterSelector: React.FC<ChapterSelectorProps> = ({ onSelect, onBack }) => {
    const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
    const [availableChapters, setAvailableChapters] = useState<number[]>([]);
    const saveManager = useSaveManager();
    const { translate } = useLocaleMessages();


    useEffect(() => {
        let tmpChapters: number[] = [];
        saveManager.currentProgress.level.forEach((level) => {
            // 这里level是关卡数,我们通过其找到chapterId,注意排序
            const chapterId = StageDataRecords[level].chapterID;
            if (!tmpChapters.includes(chapterId))
                tmpChapters.push(chapterId);
        });
        // 排序
        tmpChapters = tmpChapters.sort((a, b) => a - b);
        setAvailableChapters(tmpChapters);
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
            {/* 左侧 25% - 章节选择 */}
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
                    onClick={onBack}
                >
                    {translate('menu_back')}
                </button>

                {Object.values(availableChapters).map((chapter) => (
                    <button
                        key={chapter}
                        className='menubutton'
                        style={{
                            background: selectedChapter === chapter ? 'rgba(255, 255, 255, 0.1)' : 'none',
                            boxShadow: selectedChapter === chapter
                                ? 'inset 0 0 0 2px #00ccff'
                                : 'inset 0 0 0 2px rgba(100, 100, 100, 0.3)',
                        }}
                        onMouseOver={(e) => {
                            if (selectedChapter !== chapter) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #00ccff';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (selectedChapter !== chapter) {
                                e.currentTarget.style.background = 'none';
                                e.currentTarget.style.boxShadow = 'inset 0 0 0 2px rgba(100, 100, 100, 0.3)';
                            }
                        }}
                        onClick={() => setSelectedChapter(chapter)}
                    >
                        {translate(ChapterDataRecords[chapter].nameKey)}
                    </button>
                ))}
            </div>

            {/* 右侧 70% - 章节描述 */}
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
                {selectedChapter ? translate(ChapterDataRecords[selectedChapter].descriptionKey) : translate('menu_level_choose_chapter_tip')}
                {/* 下一步按钮 */}
                <button
                    style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '10px 20px',
                        background: selectedChapter ? '#00ccff' : '#666',
                        border: 'none',
                        color: '#fff',
                        cursor: selectedChapter ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease',
                    }}
                    disabled={!selectedChapter}
                    onClick={() => selectedChapter && onSelect(selectedChapter)}
                >
                    {translate('menu_next')}
                </button>
            </div>


        </div>
    );
};

export default ChapterSelector;
