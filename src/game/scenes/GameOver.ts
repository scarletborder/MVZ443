import {
  PhaserEventBus,
  PhaserEvents,
} from '../EventBus';
import { Scene } from 'phaser';
import { translate } from '../../i18n';

export class GameOver extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  gameOverText: Phaser.GameObjects.Text;

  constructor() {
    super('GameOver');
  }

  create() {
    this.camera = this.cameras.main
    this.camera.setBackgroundColor(0xff0000);

    this.background = this.add.image(512, 384, 'background');
    this.background.setAlpha(0.5);

    this.gameOverText = this.add.text(512, 384, translate("game.gameOver"), {
      fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
      stroke: '#000000', strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5).setDepth(100);

    PhaserEventBus.emit(PhaserEvents.CurrentSceneReady, this);
  }

  changeScene() {
    this.scene.start('MainMenu');
  }
}

