import { useEffect, useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/PhaserGame';
import { CardSlotHorizontal, EnergySlot } from './components/cardslot';
import { GameProvider } from './context/garden_ctx';
import BottomTools from './components/bottom';
import DocFrame from './components/DocFrame';
import { SaveProvider } from './context/save_ctx';
import { useSettings } from './context/settings_ctx';
import { Scene } from 'phaser';
import { EventBus } from './game/EventBus';

function App() {
    // The sprite can only be moved in the MainMenu Scene
    const [canMoveSprite, setCanMoveSprite] = useState(true);
    const [showGameTool, setShowGameTool] = useState(false);
    const [showGameScreen, setShowGameScreen] = useState(false);

    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    const { width} = useSettings();

    const gameStart = () => {
        setShowGameScreen(true);
        setShowGameTool(true);
    };
    const gameExit = () => {
        setShowGameScreen(false);
        setShowGameTool(false);
    };

    // Event emitted from the PhaserGame component
    const currentScene = (scene: Phaser.Scene) => {
        setCanMoveSprite(scene.scene.key !== 'MainMenu');
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
        <div id="app" onContextMenu={(e) => { event?.preventDefault() }}>

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
                            <div>
                                <button className='button' onClick={gameStart}>Game Start</button>
                            </div>
                            <div>
                                <button className='button' onClick={gameExit}>Game Exit</button>
                            </div>

                        </div>
                        {showGameScreen && <PhaserGame ref={phaserRef} currentActiveScene={currentScene} isVisibility={showGameScreen} />}
                        {(!showGameScreen) && <DocFrame width={width} sceneRef={phaserRef} />}
                    </div>

                    {showGameTool &&
                        <BottomTools />}

                </GameProvider>
            </SaveProvider>



        </div>
    )
}

export default App
