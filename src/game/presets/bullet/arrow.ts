import { _TypeArrowEnhancement } from "../../../constants/game";
import { IBullet } from "../../models/IBullet";
import { IExpolsion } from "../../models/IExplosion";
import { IPlant } from "../../models/IPlant";
import { IMonster } from "../../models/monster/IMonster";
import { Game } from "../../scenes/Game";
import IObstacle from "../obstacle/IObstacle";



export class Arrow extends IBullet {
    originalX: number;
    maxDistance: number = 100;

    enhancement: _TypeArrowEnhancement = 'none';
    trail: any | null = null; // 尾迹

    public catchEnhancement(en: _TypeArrowEnhancement) {
        const scene = this.scene;
        if (!scene) return;

        // 1. 动画定义（仅首次）
        if (!scene.anims.exists('fire_trail')) {
            scene.anims.create({
                key: 'fire_trail',
                frames: scene.anims.generateFrameNumbers('anime/fire', { start: 0, end: 31 }),
                // 方法 A：使用 duration 来控制整条动画循环时间（单位 ms）
                duration: 1000,    // 整圈 10 秒，代替 frameRate
                repeat: -1,
                // repeatDelay: 2000, //（可选）每次循环后停顿 2 秒再接着播放
            });
        }

        // 2. 如果新 enhancement 与当前一致，则无需重复处理
        if (this.enhancement === en) {
            return;
        }

        // 3. 旧 trail 淡出并销毁
        if (this.trail) {
            scene.tweens.add({
                targets: this.trail,
                alpha: 0,
                duration: 800,
                ease: 'Linear',
                onComplete: () => this.trail?.destroy(),
            });
            this.trail = null;
        }

        this.enhancement = en;
        const trailDepth = this.baseDepth + 1;
        const fadeDur = 100;

        // 4. 新 trail 淡入
        switch (this.enhancement) {
            case 'fire': {
                const spr = scene.add.sprite(this.x, this.y, 'anime/fire')
                    .setScale(scene.positionCalc.scaleFactor)
                    .setOrigin(0.5, 1)
                    .setDepth(trailDepth)
                    .setAlpha(0)
                    .play('fire_trail');

                // 方法 B：给动画再加一个整体速率缩放
                spr.anims.timeScale = 0.5;  // 原速的 50%

                scene.tweens.add({
                    targets: spr,
                    alpha: 1,
                    duration: fadeDur,
                    ease: 'Linear',
                });

                this.trail = spr;
                break;
            }
            case 'lightning': {
                const img = scene.add.image(this.x, this.y, 'anime/lightning_trail')
                    .setScale(scene.positionCalc.scaleFactor)
                    .setOrigin(0.5, 1)
                    .setDepth(trailDepth)
                    .setAlpha(0);

                scene.tweens.add({
                    targets: img,
                    alpha: 1,
                    duration: fadeDur,
                    ease: 'Linear',
                });
                this.trail = img;
                break;
            }
            case 'ice': {
                const img = scene.add.image(this.x, this.y, 'anime/ice_trail')
                    .setScale(scene.positionCalc.scaleFactor)
                    .setOrigin(0.5, 1)
                    .setDepth(trailDepth)
                    .setAlpha(0);

                scene.tweens.add({
                    targets: img,
                    alpha: 1,
                    duration: fadeDur,
                    ease: 'Linear',
                });
                this.trail = img;
                break;
            }
        }
    }


    constructor(scene: Game, col: number, row: number, texture: string,
        damage: number, maxDistance: number, target: 'plant' | 'zombie') {
        super(scene, col, row, texture, damage, target);
        this.maxDistance = maxDistance;

        const size = scene.positionCalc.getBulletDisplaySize();
        size.sizeX *= 2;
        size.sizeY /= 2;
        this.setDisplaySize(size.sizeX, size.sizeY);
        this.setVelocityX(+300 * scene.positionCalc.scaleFactor); // 一定要在add    之后设置速度

        this.originalX = this.x;

        this.addVisible();
    }

    update(...args: any[]): void {
        super.update();
        if ((this.x - this.originalX) > this.maxDistance) {
            this.destroy();
        }
    }

    protected preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);

        if (this.trail && this.body && !this.scene.isPaused) {
            const angle = this.body.velocity.angle();
            const offsetX = +Math.cos(angle) * this.width * 0.5;
            const offsetY = +Math.sin(angle) * this.height * 0.5;

            // 目标位置
            const targetX = this.x + offsetX;
            const targetY = this.y + offsetY;

            // 平滑系数，范围 0 到 1，越小跟随越“慢”，越大越“快”
            const lerpFactor = 0.15;

            // 对 X/Y 分别做线性插值
            this.trail.x = Phaser.Math.Linear(this.trail.x, targetX, lerpFactor);
            this.trail.y = Phaser.Math.Linear(this.trail.y, targetY, lerpFactor);
        }
    }


    CollideObject(object: IMonster | IPlant | IObstacle): void {
        // 如果附魔fire, 本次攻击会暂时提高伤害
        const _prevDamage = this.damage;
        if (this.enhancement === 'fire') {
            this.damage = Math.floor(_prevDamage * 1.5);
        }

        super.CollideObject(object);

        // 如果有ice效果,施加slow
        if (this.enhancement === 'ice'
            && object instanceof IMonster
            && this.targetCamp === 'zombie'
        ) {
            object.catchDebuff('slow', 5000);
        }

        // 恢复
        this.damage = _prevDamage;
    }

    destroy(fromScene?: boolean): void {
        const scene = this.scene;
        // 判断arrow的属性,如果被附魔了lightning, 会爆炸
        if (scene && this.enhancement === 'lightning') {
            new IExpolsion(scene, this.x, this.row, {
                damage: Math.ceil(this.damage / 4),
                rightGrid: 1,
                leftGrid: 1,
                upGrid: 1,
                targetCamp: this.targetCamp,
            });
        }

        if (this.trail && this.trail.destroy) {
            this.trail.destroy();
            this.trail = null; // 清除引用
        }

        super.destroy(fromScene);
    }
}


function NewArrow(scene: Game, col: number, row: number,
    maxDistance?: number, damage: number = 15, target: 'plant' | 'zombie' = 'zombie'): IBullet {
    if (!maxDistance) {
        maxDistance = scene.positionCalc.GRID_SIZEX * 32;
    }

    const arrow = new Arrow(scene, col, row, 'bullet/arrow', damage, maxDistance, target);
    return arrow;
}

export default NewArrow;


/**
 * MutantYAxisArrow
 * 当 当前row超过 设定值的时候,取消y速度, 只向前移动
 */
class MutantYAxisArrow extends Arrow {
    targetRow: number;
    private targetY: number;
    /**
     * 方向，true表示向上超越某个row(即row小于targetRow)，false表示向下
     */
    lowerOrUpper: boolean;

    constructor(scene: Game, col: number, row: number, texture: string,
        damage: number, maxDistance: number, target: 'plant' | 'zombie',
        targetRow: number = row, yspeed: number) {
        super(scene, col, row, texture, damage, maxDistance, target);

        // 判断目标row和当前row的关系
        this.targetRow = targetRow;
        const { y } = scene.positionCalc.getBulletCenter(col, targetRow);
        this.targetY = y;
        this.lowerOrUpper = targetRow < row;

        if (this.lowerOrUpper && this.setVelocityY) {
            this.setVelocityY(-yspeed); // 向上
        }
        else if (this.setVelocityY) {
            this.setVelocityY(+yspeed); // 向下
        }



    }

    update(...args: any[]): void {
        super.update();

        if (!this || !this.setVelocityY || this.penetrate === 0) {
            return;  // Ensure `this` is not undefined and `setVelocityY` is available
        }

        try {
            // 如果当前row超过了设定值,取消y速度, 只向前移动
            if (this.lowerOrUpper) {
                if (this.y < this.targetY) {
                    this.setVelocityY(0); // 取消y速度
                    this.setY(this.targetY); // 设置到目标位置
                }
            }
            else {
                if (this.y > this.targetY) {
                    this.setVelocityY(0); // 取消y速度
                    this.setY(this.targetY); // 设置到目标位置
                }
            }
        } catch {
            if (this && this.destroy && this.scene) this.destroy();
        }
    }
}


export function NewMutantYAxisArrow(scene: Game, col: number, row: number,
    maxDistance?: number, damage: number = 15, target: 'plant' | 'zombie' = 'zombie',
    targetRow: number = row, yspeed: number = 200): IBullet {
    if (!maxDistance) {
        maxDistance = scene.positionCalc.GRID_SIZEX * 32;
    }

    const arrow = new MutantYAxisArrow(scene, col, row, 'bullet/arrow', damage, maxDistance, target, targetRow,
        yspeed * scene.positionCalc.scaleFactor);
    return arrow;
}