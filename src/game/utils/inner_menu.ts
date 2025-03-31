import { debounce } from "../../utils/debounce";
import DepthManager from "../../utils/depth";
import { HasConnected } from "../../utils/net/sync";
import { Game } from "../scenes/Game";

export default function CreateInnerMenu(game: Game) {
    // 屏幕中央显示 "已停止" 的文本，默认隐藏
    game.pauseBtn = game.add.text(
        game.cameras.main.width,
        game.cameras.main.height,
        '暂停',
        {
            fontSize: game.scale.displaySize.width / 30,
            color: 'rgb(187, 21, 21)',
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            padding: { x: 10, y: 5 },
        }
    ).setOrigin(1, 1).setInteractive().setDepth(DepthManager.getMenuDepth());
    game.pauseBtn.on('pointerup', () => {
        // 判断场景有无暂停
        debounce(() => {
            if (HasConnected()) return; // 联机模式不准暂停
            const currently = game.physics.world.isPaused;
            game.handlePause({ paused: !currently });
        }, 100)();
    }, game);

    game.pauseText = game.add.text(
        game.cameras.main.width / 2,
        game.cameras.main.height / 3,
        '已停止',
        {
            fontSize: game.scale.displaySize.width / 20,
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            padding: { x: 10, y: 5 },
        }
    ).setOrigin(0.5).setVisible(false).setDepth(DepthManager.getMenuDepth());

    game.exitText = game.add.text(
        game.cameras.main.width / 2,
        game.cameras.main.height,
        '退出游戏',
        {
            fontSize: game.scale.displaySize.width / 20,
            color: 'rgb(187, 21, 21)',
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            padding: { x: 10, y: 5 },
        }
    ).setOrigin(0.5, 1).setVisible(false).disableInteractive().setDepth(DepthManager.getMenuDepth());
    game.exitText.on('pointerup', () => { game.handleExit(false) }, game);

    game.speedText = game.add.text(
        game.cameras.main.width,
        0,
        '1速',
        {
            fontSize: game.scale.displaySize.width / 20,
            color: 'rgb(187, 21, 21)',
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            padding: { x: 10, y: 5 },
        }
    ).setOrigin(1, 0).setVisible(true).setInteractive().setDepth(DepthManager.getMenuDepth());

    game.speedText.on('pointerup', () => {
        game.handleSpeedUp();
    });

    const KeyT = game.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    if (KeyT) {
        KeyT.on('down', () => {
            game.handleSpeedUp();
        });
    }
}