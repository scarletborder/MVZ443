import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { GameParams } from './models/GameParams';

const LOGICAL_GAME_WIDTH = 800;
const LOGICAL_GAME_HEIGHT = 600;

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: LOGICAL_GAME_WIDTH,
  height: LOGICAL_GAME_HEIGHT,

  autoRound: true,
  fps: {
    target: 60,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,

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
  backgroundColor: 'rgba(0,0,0,0)',
  transparent: true,
  scene: [
    Boot,
    Preloader,
    MainGame,
    GameOver
  ]
};

const StartGame = (parent: string, width: number, GameParams: GameParams) => {
  void width;
  config.width = LOGICAL_GAME_WIDTH;
  config.height = LOGICAL_GAME_HEIGHT;
  let game = new Game({ ...config, parent })
  game.registry.set('gameParams', GameParams);
  return game;

}

export default StartGame;
