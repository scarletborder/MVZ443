// src/components/LevelSelector.tsx
import React, { useEffect, useState } from 'react';
import { GameParams } from '../../game/models/GameParams';
import ChapterSelector from './level/ChapterSelector';
import StageSelector from './level/StageSelector';
import ParamsSelector from './level/ParamsSelector';
import { StageDataRecords } from '../../game/utils/loader';
import BackendWS from '../../utils/net/sync';
import encodeMessageToBinary from '../../utils/net/encode';

interface LevelSelectorProps {
    width: number;
    height: number;
    onBack: () => void;
    setGameParams: (params: GameParams) => void;
    startGame: () => void;

    skipToParams?: boolean;
    chosenStage?: number;
    islord?: boolean;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({ setGameParams, startGame, width, height, onBack,
    skipToParams, chosenStage, islord }) => {
    const [currentStep, setCurrentStep] = useState<'chapter' | 'stage' | 'params'>('chapter');
    const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
    const [selectedStageId, setSelectedStageId] = useState<number | null>(null);

    const handleBack = () => {
        if (currentStep === 'stage') setCurrentStep('chapter');
        if (currentStep === 'params') setCurrentStep('stage');
    };

    useEffect(() => {
        if (skipToParams && chosenStage) {
            setSelectedChapterId(StageDataRecords[chosenStage].chapterID);
            setSelectedStageId(chosenStage);
            setCurrentStep('params');
        }
    }, [skipToParams, chosenStage]);

    useEffect(() => {
        const chapterJumpHandler = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.type === 0x00 && !islord) {
                const chapterID = data.chapterId;
                // 不选卡了
                if (chapterID === 0) {
                    console.log('get back');
                    onBack();
                }
            }
        }
        BackendWS.addMessageListener(chapterJumpHandler);
        return () => {
            BackendWS.delMessageListener(chapterJumpHandler);
        }
    }, []);

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
                        if (islord) {
                            console.log("send message map");
                            BackendWS.send(encodeMessageToBinary({
                                type: 0x10,
                                chapterId: stageId
                            }));
                        }
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
                    onBack={() => {
                        if (islord) {
                            BackendWS.sendMessage(JSON.stringify(
                                {
                                    type: 0x10,
                                    chapterId: 0
                                }
                            ))
                        }
                        handleBack();
                    }}
                />
            )}
        </div>
    );
};

export default LevelSelector;
