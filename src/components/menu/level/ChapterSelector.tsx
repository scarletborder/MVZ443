// src/components/ChapterSelector.tsx
import React from 'react';
import { ChapterDataRecords, StageDataRecords } from '../../../game/utils/loader';
import { useSaveManager } from '../../../context/save_ctx';
import { useLocaleMessages } from '../../../hooks/useLocaleMessages';
import { stageKey } from '../../../i18n/keys';
import { useSetState, useLocalStorageState, useMount, useMemoizedFn } from 'ahooks';

interface ChapterSelectorProps {
    onSelect: (chapterId: number) => void;
    onBack: () => void;
}

const ChapterSelector: React.FC<ChapterSelectorProps> = ({ onSelect, onBack }) => {
    const [state, setState] = useSetState({
        selectedChapter: null as number | null,
        availableChapters: [] as number[],
    });

    // 使用 useLocalStorageState 保存用户选择的章节
    const [chapterSelection, setChapterSelection] = useLocalStorageState('chapterSelection', {
        defaultValue: {
            lastSelectedChapter: null as number | null,
        }
    });

    const saveManager = useSaveManager();
    const { translate } = useLocaleMessages();

    // 计算可用章节
    const calculateAvailableChapters = useMemoizedFn(() => {
        let tmpChapters: number[] = [];
        saveManager.currentProgress.level.forEach((level) => {
            const chapterId = StageDataRecords[level].chapterID;
            if (!tmpChapters.includes(chapterId)) {
                tmpChapters.push(chapterId);
            }
        });
        return tmpChapters.sort((a, b) => a - b);
    });

    // 初始化可用章节
    useMount(() => {
        const chapters = calculateAvailableChapters();
        setState({ availableChapters: chapters });
        
        // 恢复上次选择的章节
        if (chapterSelection.lastSelectedChapter && chapters.includes(chapterSelection.lastSelectedChapter)) {
            setState({ selectedChapter: chapterSelection.lastSelectedChapter });
        }
    });

    const handleChapterSelect = useMemoizedFn((chapter: number) => {
        setState({ selectedChapter: chapter });
        setChapterSelection({ lastSelectedChapter: chapter });
    });

    const handleNext = useMemoizedFn(() => {
        if (state.selectedChapter) {
            onSelect(state.selectedChapter);
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
                    {translate('menu.back')}
                </button>

                {state.availableChapters.map((chapter) => (
                    <button
                        key={chapter}
                        className='menubutton'
                        style={{
                            background: state.selectedChapter === chapter ? 'rgba(255, 255, 255, 0.1)' : 'none',
                            boxShadow: state.selectedChapter === chapter
                                ? 'inset 0 0 0 2px #00ccff'
                                : 'inset 0 0 0 2px rgba(100, 100, 100, 0.3)',
                        }}
                        onMouseOver={(e) => {
                            if (state.selectedChapter !== chapter) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #00ccff';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (state.selectedChapter !== chapter) {
                                e.currentTarget.style.background = 'none';
                                e.currentTarget.style.boxShadow = 'inset 0 0 0 2px rgba(100, 100, 100, 0.3)';
                            }
                        }}
                        onClick={() => handleChapterSelect(chapter)}
                    >
                        {translate(stageKey(ChapterDataRecords[chapter].nameKey))}
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
                {state.selectedChapter ? translate(stageKey(ChapterDataRecords[state.selectedChapter].descriptionKey)) : translate('menu.level_choose_chapter_tip')}
                {/* 下一步按钮 */}
                <button
                    style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '10px 20px',
                        background: state.selectedChapter ? '#00ccff' : '#666',
                        border: 'none',
                        color: '#fff',
                        cursor: state.selectedChapter ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease',
                    }}
                    disabled={!state.selectedChapter}
                    onClick={handleNext}
                >
                    {translate('menu.next')}
                </button>
            </div>
        </div>
    );
};

export default ChapterSelector;
