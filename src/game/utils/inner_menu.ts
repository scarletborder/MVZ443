import { debounce } from "../../utils/debounce";
import DepthManager from "../../utils/depth";
import { HasConnected } from "../../utils/net/sync";
import { Game } from "../scenes/Game";
import { PauseMenu } from "./PauseMenu";

export default function CreateInnerMenu(game: Game) {
    // 创建暂停菜单实例
    const pauseMenu = new PauseMenu(game);
    // 将暂停菜单实例添加到game对象中，以便其他地方可以访问
    (game as any).pauseMenu = pauseMenu;

    // 屏幕右下角的暂停按钮
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
            console.log('pause')
            if (HasConnected()) return; // 联机模式不准暂停
            const currently = game.isPaused;
            game.handlePause({ paused: !currently });
        }, 100)();
    }, game);

    game.speedText = game.add.text(
        game.cameras.main.width,
        0,
        '1速',
        {
            fontSize: game.scale.displaySize.width / 20,
            color: 'rgba(187, 21, 21, 0.5)',
            padding: { x: 10, y: 5 },
        }
    ).setOrigin(1, 0).setVisible(true).setInteractive().setDepth(DepthManager.getMenuDepth());

    game.speedText.on('pointerup', () => {
        game.handleSpeedUp();
    });

    const KeyT = game.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    if (KeyT) {
        KeyT.on('down', () => {
            console.log('speed up')
            game.handleSpeedUp();
        });
    }
}