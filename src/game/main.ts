import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { GameParams } from './models/GameParams';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    fps: {
        target: 60,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: true
        }
    },
    scale: {
        mode: Phaser.Scale.NONE,

        // Minimum size
        min: {
            width: 800,
            height: 600
        },
        // Maximum size
        max: {
            width: 1600,
            height: 1200
        },

    },
    parent: 'game-container',
    backgroundColor: '#028af8',
    scene: [
        Boot,
        Preloader,
        MainGame,
        GameOver
    ]
};

const StartGame = (parent: string, width: number, GameParams: GameParams) => {
    config.width = width;
    config.height = width * 3 / 4;
    let game = new Game({ ...config, parent })
    game.registry.set('gameParams', GameParams);
    return game;

}

export default StartGame;
