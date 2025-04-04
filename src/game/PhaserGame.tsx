import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import StartGame from './main';
import { EventBus } from './EventBus';
import { useSettings } from '../context/settings_ctx';
import { GameParams } from './models/GameParams';
import { StageResult } from './models/IRecord';

export interface IRefPhaserGame {
    game: Phaser.Game | null;
    scene: Phaser.Scene | null;
}

interface IProps {
    currentActiveScene?: (scene_instance: Phaser.Scene) => void,
    isVisibility: boolean,
    gameParams: GameParams | null,
    gameExit: (result: StageResult) => void
}


export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(function PhaserGame({
    currentActiveScene, isVisibility, gameParams, gameExit }, ref) {
    if (!gameParams) {
        return <p>no game params!@!</p>
    }
    gameParams.gameExit = gameExit;

    const { width } = useSettings();
    const game = useRef<Phaser.Game | null>(null!);

    useLayoutEffect(() => {
        if (game.current === null) {

            game.current = StartGame("game-container", width, gameParams);

            if (typeof ref === 'function') {
                ref({ game: game.current, scene: null });
            } else if (ref) {
                ref.current = { game: game.current, scene: null };
            }

        }

        return () => {
            if (game.current) {
                game.current.destroy(true);
                if (game.current !== null) {
                    game.current = null;
                }
            }
        }
    }, [ref]);

    useEffect(() => {
        EventBus.on('current-scene-ready', (scene_instance: Phaser.Scene) => {
            if (currentActiveScene && typeof currentActiveScene === 'function') {
                currentActiveScene(scene_instance);
            }

            if (typeof ref === 'function') {
                ref({ game: game.current, scene: scene_instance });
            } else if (ref) {
                ref.current = { game: game.current, scene: scene_instance };
            }

        });
        return () => {
            EventBus.removeListener('current-scene-ready');
        }
    }, [currentActiveScene, ref]);

    return (
        <div id="game-container" style={{
            visibility: isVisibility ? 'visible' : 'hidden',
        }}></div>
    );

});
