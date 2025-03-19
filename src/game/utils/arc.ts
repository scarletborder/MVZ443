// 空中划过一道上凸arc
// 想要变成鹰的Arcade.Sprite

import DepthManager from "../../utils/depth";
import { Game } from "../scenes/Game";

export function StartArc(game: Game, x1: number, y1: number, x2: number, y2: number,
    texture: string, duration: number, callback: () => void, _arcHeight?: number) {
    // 定义一个 arcHeight 参数，用来决定弧线的高度（截距），值越大弧线越高
    let arcHeight = (_arcHeight || 200) * game.positionCalc.scaleFactor;

    let start = new Phaser.Math.Vector2(x1, y1);
    let end = new Phaser.Math.Vector2(x2, y2);
    // 控制点在起点和终点中点的基础上，垂直上移 arcHeight
    let controlPoint = new Phaser.Math.Vector2(
        (x1 + x2) / 2,
        Math.min(y1, y2) - arcHeight
    );

    // 创建二次贝塞尔曲线
    let curve = new Phaser.Curves.QuadraticBezier(start, controlPoint, end);

    // 创建一个临时贴图，假设 'tempTexture' 是预加载的贴图 key
    let tempImage = game.add.image(x1, y1, texture).setDepth(DepthManager.getInGameUIUnImportant(0));

    // 用于记录曲线进度的对象和临时向量
    let path = { t: 0, vec: new Phaser.Math.Vector2() };

    // 使用 Tween 让 t 从 0 变化到 1，并更新临时贴图的位置
    game.tweens.add({
        targets: path,
        t: 1,
        duration: duration, // 根据需要调整动画持续时间
        ease: 'Sine.easeInOut',
        onUpdate: () => {
            // 根据当前 t 值获取曲线上的位置
            curve.getPoint(path.t, path.vec);
            tempImage.setPosition(path.vec.x, path.vec.y);
        },
        onComplete: () => {
            // 曲线移动完成后销毁临时贴图
            tempImage.destroy();
            // 在终点位置调用回调函数创建新的 sprite
            callback();
        }
    });
}