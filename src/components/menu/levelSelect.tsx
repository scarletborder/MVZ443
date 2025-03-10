// src/components/LevelSelector.tsx
import React, { useState } from 'react';
import { GameParams } from '../../game/models/GameParams';
import ChapterSelector from './level/ChapterSelector';
import StageSelector from './level/StageSelector';
import ParamsSelector from './level/ParamsSelector';

interface LevelSelectorProps {
    width: number;
    height: number;
    onBack: () => void;
    setGameParams: (params: GameParams) => void;
    startGame: () => void;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({ setGameParams, startGame, width, height, onBack }) => {
    const [currentStep, setCurrentStep] = useState<'chapter' | 'stage' | 'params'>('chapter');
    const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
    const [selectedStageId, setSelectedStageId] = useState<number | null>(null);

    const handleBack = () => {
        if (currentStep === 'stage') setCurrentStep('chapter');
        if (currentStep === 'params') setCurrentStep('stage');
    };

    return (
        <div style={{
            width: `${width}px`,
            height: `${height}px`,
            background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
            position: "relative",
            overflow: "hidden",
            border: "2px solid #444",
            boxShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
            animation: "frameFadeIn 0.5s ease-out"
        }}>
            {currentStep === 'chapter' && (
                <ChapterSelector
                    onSelect={(chapterId) => {
                        setSelectedChapterId(chapterId);
                        setCurrentStep('stage');
                    }}
                    onBack={onBack}
                />
            )}
            {currentStep === 'stage' && selectedChapterId !== null && (
                <StageSelector
                    chapterId={selectedChapterId}
                    onSelect={(stageId) => {
                        setSelectedStageId(stageId);
                        setCurrentStep('params');
                    }}
                    onBack={handleBack}
                />
            )}
            {currentStep === 'params' && selectedChapterId !== null && selectedStageId !== null && (
                <ParamsSelector
                    chapterId={selectedChapterId}
                    stageId={selectedStageId}
                    setGameParams={setGameParams}
                    startGame={startGame}
                    onBack={handleBack}
                />
            )}
        </div>
    );
};

export default LevelSelector;
