import { useCallback, useEffect, useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/PhaserGame';
import { CardSlotHorizontal, EnergySlot } from './components/cardslot';
import { GameProvider } from './context/garden_ctx';
import BottomTools from './components/bottom';
import DocFrame from './components/DocFrame';
import { SaveProvider } from './context/save_ctx';
import { useSettings } from './context/settings_ctx';
import { Scene } from 'phaser';
import { EventBus } from './game/EventBus';
import { GameParams } from './game/models/GameParams';

function App() {
    // State to control the visibility of the game tool
    const [showGameTool, setShowGameTool] = useState(false);
    const [showGameScreen, setShowGameScreen] = useState(false);
    const [gameParams, setGameParams] = useState<GameParams | null>(null);

    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    const { width } = useSettings();

    const gameStart = useCallback(() => {
        setShowGameScreen(true);
        setShowGameTool(true);
    }, [setShowGameScreen, setShowGameTool]);

    const gameExit = useCallback(() => {
        if (phaserRef.current) {
            phaserRef.current.game?.destroy(true);
            phaserRef.current = null;
        }
        setShowGameScreen(false);
        setShowGameTool(false);
    }, [setShowGameScreen, setShowGameTool]);

    // Event emitted from the PhaserGame component
    const currentScene = (scene: Phaser.Scene) => {
        // setCanMoveSprite(scene.scene.key !== 'MainMenu');
    }

    // 监听键盘事件，阻止 F11 触发全屏
    useEffect(() => {
        const handleKeyDown = (event: any) => {
            if (event.key === "F11") {
                event.preventDefault();
            }
        };
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);


    return (
        <div id="app" onContextMenu={(e) => { event?.preventDefault() }} style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
            KhtmlUserSelect: "none",
        }}>

            <SaveProvider>
                <GameProvider>
                    {showGameTool &&
                        <div id="cardsContainer" style={{
                            "height": width / 8,
                            "maxHeight": '135px',
                            "width": width,
                            display: "flex",
                            "flexDirection": "row"
                        }}>
                            <EnergySlot sceneRef={phaserRef} />
                            <CardSlotHorizontal sceneRef={phaserRef} />
                        </div>}


                    <div id="mainContainer">
                        <div id="controlContainer">


                        </div>
                        {showGameScreen && <PhaserGame ref={phaserRef} currentActiveScene={currentScene} isVisibility={showGameScreen} gameParams={gameParams} gameExit={gameExit} />}
                        {(!showGameScreen) && <DocFrame width={width} sceneRef={phaserRef} setGameParams={setGameParams} gameStart={gameStart} />}
                    </div>

                    {showGameTool &&
                        <BottomTools />}

                </GameProvider>
            </SaveProvider>



        </div>
    )
}

export default App
