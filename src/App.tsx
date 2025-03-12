import { useCallback, useEffect, useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/PhaserGame';
import { CardSlotHorizontal, CardSlotVertical, EnergySlot, VerticalEnergySlot } from './components/cardslot';
import { GameProvider } from './context/garden_ctx';
import BottomTools from './components/bottom';
import DocFrame from './components/DocFrame';
import { SaveProvider } from './context/save_ctx';
import { useSettings } from './context/settings_ctx';
import { GameParams } from './game/models/GameParams';
import i18n from './utils/i18n';
import { OnWin, StageResult } from './game/models/IRecord';
import GameResultView from './components/menu/result';
import { useDeviceType } from './hooks/useDeviceType';

function App() {
    // State to control the visibility of the game tool
    const [showGameTool, setShowGameTool] = useState(false);
    const [showGameScreen, setShowGameScreen] = useState(false);
    const [showGameResult, setShowGameResult] = useState(false);
    const [gameParams, setGameParams] = useState<GameParams | null>(null);
    const [gameResult, setGameResult] = useState<StageResult | null>(null);
    const deviceType = useDeviceType();

    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    const { width } = useSettings();

    const gameStart = useCallback(() => {
        setShowGameScreen(true);
        setShowGameTool(true);
    }, [setShowGameScreen, setShowGameTool]);

    const exitResultView = useCallback(() => {
        setGameResult(null);
        setShowGameResult(false);
        setShowGameScreen(false);
        setShowGameTool(false);
    }, [setShowGameResult, setShowGameScreen, setShowGameTool]);

    const gameExit = useCallback((result: StageResult) => {
        if (phaserRef.current) {
            phaserRef.current.game?.destroy(true);
            phaserRef.current = null;
        }
        setShowGameScreen(false);
        setShowGameTool(false);

        // 结算
        setGameResult(result);
        setShowGameResult(true);
    }, [setShowGameScreen, setShowGameTool]);

    // Event emitted from the PhaserGame component
    const currentScene = (scene: Phaser.Scene) => {
        // setCanMoveSprite(scene.scene.key !== 'MainMenu');
    }

    // 监听键盘事件
    useEffect(() => {
        console.log(deviceType)
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "F1" || event.key === "F2" || event.key === "F3" || event.key === "F4"
                || event.key === "F5" || event.key === "F6" || event.key === "F7" || event.key === "F8"
                || event.key === "F9" || event.key === "F10" || event.key === 'ESC') {
                event.preventDefault();
            }
        };
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    // 设置语言
    useEffect(() => {
        const lang = navigator.language;
        if (lang.startsWith('zh')) {
            i18n.set('zh_CN');
        } else {
            i18n.set('en_US');
        }
    }, []);

    return (
        <div id="app" onContextMenu={(e) => { event?.preventDefault() }} style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
            KhtmlUserSelect: "none",
            display: "flex",
            flexDirection: deviceType === 'pc' ? "column" : "row",
            justifyContent: "center",
        }}>
            <SaveProvider>
                <GameProvider>
                    {showGameTool && deviceType === 'pc' &&
                        <div id="cardsContainer" style={{
                            "height": width / 8,
                            "maxHeight": '135px',
                            "width": width,
                            display: "flex",
                            "flexDirection": "row"
                        }}>
                            <EnergySlot />
                            <CardSlotHorizontal sceneRef={phaserRef} gameParams={gameParams} />
                        </div>}

                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                    }}>
                        {deviceType === 'mobile' && showGameScreen &&
                            <div id='mobileCardContainer' style={{
                                width: width / 8,
                                maxWidth: '135px',
                                height: width * 79 / 100,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                marginRight: "10px",
                            }}>
                                <VerticalEnergySlot />
                                <CardSlotVertical
                                    sceneRef={phaserRef}
                                    gameParams={gameParams}
                                />
                            </div>
                        }
                        <div id="mainContainer" style={{
                            width: width,
                            display: "flex",
                            flexDirection: "column", // 改为垂直布局以容纳 BottomTools
                        }}>
                            <div id="controlContainer">
                            </div>
                            {showGameScreen && (!showGameResult) &&
                                <PhaserGame
                                    ref={phaserRef}
                                    currentActiveScene={currentScene}
                                    isVisibility={showGameScreen}
                                    gameParams={gameParams}
                                    gameExit={gameExit}
                                />
                            }
                            {(!showGameScreen) && (!showGameResult) &&
                                <DocFrame
                                    width={width}
                                    sceneRef={phaserRef}
                                    setGameParams={setGameParams}
                                    gameStart={gameStart}
                                />
                            }
                            {showGameResult && (!showGameScreen) && (gameResult) &&
                                <GameResultView
                                    isWin={gameResult?.isWin ? gameResult.isWin : false}
                                    onWin={gameResult?.onWin}
                                    progressRewards={gameResult?.rewards}
                                    myProgress={gameResult?.progress ? gameResult.progress : 0}
                                    onBack={exitResultView}
                                    width={width}
                                    height={width * 3 / 4}
                                />
                            }
                            {showGameTool &&
                                <BottomTools
                                    width={width}
                                    chapterID={gameParams?.level}
                                />
                            }
                        </div>


                    </div>
                </GameProvider>
            </SaveProvider>
        </div>
    )
}

export default App
