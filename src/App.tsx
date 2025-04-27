import { useCallback, useEffect, useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/PhaserGame';
import { CardSlotHorizontal, CardSlotVertical, EnergySlot, VerticalEnergySlot, ViceCardSlot } from './components/widget/cardslot';
import BottomTools from './components/widget/bottom';
import DocFrame from './components/DocFrame';
import { useSettings } from './context/settings_ctx';
import { GameParams } from './game/models/GameParams';
import { StageResult } from './game/models/IRecord';
import GameResultView from './components/menu/result';
import { useDeviceType } from './hooks/useDeviceType';
import BackendWS from './utils/net/sync';
import encodeMessageToBinary from './utils/net/encode';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import UpdatesPage from './pages/updates';
import SettingsPage from './pages/settings';
import Docs from './pages/docs';
import DocDetail from './pages/docDetail';
import { publicUrl } from './utils/browser';


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

    const { width, toggleLanguage } = useSettings();

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
        if (BackendWS.isConnected) {
            const encoded = encodeMessageToBinary({ type: 0x20 });
            BackendWS.send(encoded);
        }
    }, [setShowGameScreen, setShowGameTool]);

    // Event emitted from the PhaserGame component
    const currentScene = (scene: Phaser.Scene) => {
        // setCanMoveSprite(scene.scene.key !== 'MainMenu');
    }

    // 监听键盘事件
    useEffect(() => {
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
            toggleLanguage('zh_CN');
        } else {
            toggleLanguage('en_US');
        }
    }, []);

    useEffect(() => {
        // 在游戏启动时添加全局错误处理
        window.addEventListener('error', function (event) {
            console.warn('捕获到全局错误:', event.error);
            // 你可以根据需要在这里做一些清理工作，避免游戏崩溃
        }, true);
    }, []);

    const GameMainWindow = () => {
        return (<div id="app" onContextMenu={(e) => { event?.preventDefault() }} style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
            KhtmlUserSelect: "none",
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
        }}>
            <div style={{
                flexDirection: deviceType === 'pc' ? "column" : "row",
            }}>  {showGameTool && deviceType === 'pc' &&
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
                    {showGameTool && deviceType === 'mobile' &&
                        <div id='mobileCardContainer' style={{
                            width: width / 7,
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
            </div>
            {showGameTool &&
                <div style={{
                    width: width / 7,
                    maxWidth: '135px',
                    height: (width * 29 / 32),
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    marginRight: "10px",
                }}>
                    <ViceCardSlot
                        sceneRef={phaserRef}
                        gameParams={gameParams} />
                </div>}
        </div>);
    }

    return (
        <Router>
            <Routes>
                <Route path={`${publicUrl}/`} element={<GameMainWindow />} />
                <Route path={`${publicUrl}/settings`} element={<SettingsPage width={width} height={width * 3 / 4} />} />
                <Route path={`${publicUrl}/updates`} element={<UpdatesPage />} />

                <Route path={`${publicUrl}/docs`} element={<Docs />} />
                <Route path={`${publicUrl}/docs/:name`} element={<DocDetail />} />
            </Routes>
        </Router>
    )
}

export default App
