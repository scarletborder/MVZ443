// 平射烟花火箭

import { IBullet } from "../../models/IBullet";
import { IExpolsion } from "../../models/IExplosion";
import { Game } from "../../scenes/Game";
import BounceableBullet from "./bounceable";



export class HFireWork extends BounceableBullet {
    scene: Game;
    originalX: number;
    maxDistance: number = 100;
    explodeDamage: number = 0; // 爆炸伤害

    constructor(scene: Game, col: number, row: number,
        damage: number, maxDistance: number, target: 'plant' | 'zombie', explodeDamage: number = 0) {
        const texture = 'bullet/Hfirework';
        super(scene, col, row, texture, damage, target);
        this.scene = scene;
        this.maxDistance = maxDistance;
        this.explodeDamage = explodeDamage;

        const size = scene.positionCalc.getBulletDisplaySize();
        size.sizeX *= 2;
        size.sizeY /= 2;
        this.setDisplaySize(size.sizeX, size.sizeY);
        this.setVelocityX(+300 * scene.positionCalc.scaleFactor); // 一定要在add    之后设置速度

        this.originalX = this.x;
        this.addVisible();
    }
    playSound(): void {
        this.scene.musical.shootFireworkPool.play(); // 播放音效
    }

    update(...args: any[]): void {
        super.update();
        if ((this.x - this.originalX) > this.maxDistance) {
            this.destroy();
        }
    }

    protected preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        if (!this.scene.isPaused && this.body) {
            const scene = this.scene;
            // 添加烟花特效
            const angle = this.body.velocity.angle();
            const offsetX = -Math.cos(angle) * this.width * 0.5;
            const offsetY = -Math.sin(angle) * this.height * 0.5;

            // 确保同一位置不会重复创建动画
            // const existingSmoke = this.scene.children.getChildren().find(child => child.texture.key === 'anime/death_smoke');
            // if (existingSmoke) {
            //     return; // 如果已经存在相同的烟雾动画，避免重复创建
            // }

            const anime = this.scene.add.sprite(this.x + offsetX, this.y + offsetY, 'anime/death_smoke');
            anime.setDisplaySize(this.height * 2, this.height * 2)
                .setOrigin(0.5, 1)
                .setDepth(this.depth + 1)
                .setAlpha(0);  // 初始化时透明度为0

            // 创建动画（如果没有）
            if (!scene.anims.exists('rocket_smoke')) {
                scene.anims.create({
                    key: 'rocket_smoke',
                    frames: scene.anims.generateFrameNumbers('anime/death_smoke', { start: 0, end: 7 }),
                    frameRate: 7, // 减少帧率，降低动画切换频率
                    repeat: 0,
                });
            }

            // 播放动画
            anime.play('rocket_smoke');

            // 添加渐变效果，使其更加柔和
            scene.tweens.add({
                targets: anime,
                alpha: 1,
                duration: 500,  // 渐变持续时间
                ease: 'Linear',
                onComplete: () => {
                    // 动画完成后渐变消失并销毁
                    scene.tweens.add({
                        targets: anime,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            anime.destroy();
                        }
                    });
                }
            });
        }
    }


    destroy(fromScene?: boolean): void {
        // 发生爆炸
        const game = this.scene;
        if (!game) return;
        new IExpolsion(game, this.x, this.row, {
            damage: this.explodeDamage,
            rightGrid: 0.5,
            leftGrid: 0.25,
            upGrid: 0,
        })

        super.destroy(fromScene);
    }
}


function NewHorizontalFireWork(scene: Game, col: number, row: number,
    maxDistance?: number, damage: number = 15, target: 'plant' | 'zombie' = 'zombie', explodeDamage = 0): IBullet {
    if (!maxDistance) {
        maxDistance = scene.positionCalc.GRID_SIZEX * 32;
    }

    const arrow = new HFireWork(scene, col, row, damage, maxDistance, target, explodeDamage);
    return arrow;
}

export default NewHorizontalFireWork;

