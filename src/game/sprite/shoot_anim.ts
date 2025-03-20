import { Game } from "../scenes/Game";

export default function createShootBomb(scene: Game, x: number, y: number, size: number = 16, depth: number = 20000) {
    // 创建爆炸的 sprite，这里假设你已经加载了名为 'explosion' 的图片或精灵图
    let explosion = scene.add.sprite(x, y, 'shoot_bomb');
    explosion.setDisplaySize(size, size).setDepth(depth);
    // 设置初始透明度为 0.7
    explosion.alpha = 0.7;

    // 使用 tween 快速将 alpha 从 0.7 过渡到 0.2
    scene.tweens.add({
        targets: explosion,
        alpha: 0.2,
        duration: 300, // 这里设置过渡时间为 300 毫秒，可根据需要调整
        ease: 'Linear',
        onComplete: () => {
            // 动画完成后销毁 sprite
            explosion.destroy();
        }
    });
}
