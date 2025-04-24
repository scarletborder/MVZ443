/**
 *  双头发射器
 */

import { SECKILL } from "../../../../../public/constants";
import { item } from "../../../../components/shop/types";
import ProjectileDamage from "../../../../constants/damage";
import i18n from "../../../../utils/i18n";
import { GetIncValue } from "../../../../utils/numbervalue";
import { IPlant } from "../../../models/IPlant";
import { IRecord } from "../../../models/IRecord";
import { Game } from "../../../scenes/Game";
import createShootBurst from "../../../sprite/shoot_anim";
import { FrameTimer } from "../../../sync/ticker";
import NewArrow from "../../bullet/arrow";
import NewHorizontalFireWork from "../../bullet/firework";

class double_dispenser extends IPlant {
    base: Phaser.GameObjects.Sprite; // 底座, frame1
    head: Phaser.GameObjects.Sprite; // 发射器头, frame2

    headX: number;

    constructor(scene: Game, col: number, row: number,
        texture: string, level: number
    ) {
        super(scene, col, row, texture, DoubleDispenser_Record.pid, level);
        this.setVisible(false);
        this.setHealthFirstly(300);

        // anim
        const size = scene.positionCalc.getPlantDisplaySize();
        size.sizeX *= 1.2;
        size.sizeY *= 1.2;
        // 头部：frame 1，初始位置与底座对齐
        this.head = scene.add.sprite(this.x, this.y, texture, 2).setOrigin(0.5, 1)
            .setDisplaySize(size.sizeX, size.sizeY).setDepth(this.depth);
        // 底座：frame 0
        this.base = scene.add.sprite(this.x, this.y, texture, 1).setOrigin(0.5, 1)
            .setDisplaySize(size.sizeX, size.sizeY).setDepth(this.depth - 1);
        // !important: 不要用container,很神奇吧,也不要add existing
        this.headX = this.head.x;
        this.Timer = this.normalShootEvent();
    }

    shootAnimation() {
        // 安全检查：确保所有需要的对象都存在
        if (!this.scene || !this.head || this.health <= 0) {
            return;
        }

        try {
            // 计算移动距离
            const moveDistance = this.head.displayWidth * 0.15;
            const originalX = this.headX;

            // 第一个 tween：向左平移
            this.scene.tweens.add({
                targets: this.head,
                x: originalX - moveDistance,
                duration: 200,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    // 完成时再次检查对象是否有效
                    if (!this.scene || !this.head || this.health <= 0) {
                        return;
                    }

                    createShootBurst(
                        this.scene,
                        this.head.x + this.width * 4 / 9,
                        this.head.y - this.height * 2 / 3,
                        24,
                        this.depth + 2
                    );

                    // 回弹动画前再次检查
                    if (this.scene && this.head && this.health > 0) {
                        this.scene?.tweens.add({
                            targets: this.head,
                            x: originalX,
                            duration: 200,
                            ease: 'Sine.easeIn',
                            onComplete: () => {
                                // 确保结束时位置正确
                                if (this.head && this.health > 0) {
                                    this.head.x = originalX;
                                }
                            }
                        });
                    }
                }
            });
        } catch (e) {
            console.warn('Dispenser shootAnimation error:', e);
            // 发生错误时尝试恢复位置
            if (this.head && this.health > 0) {
                this.head.x = this.headX;
            }
        }
    }


    normalShootEvent(): FrameTimer | null {
        // 如果对象或场景不存在，则直接返回 null
        if (!this.scene || this.health <= 0) {
            return null;
        }
        return this.scene?.frameTicker.addEvent({
            startAt: 600,
            delay: 900,
            loop: true,
            callback: () => {
                // 这里先判断对象及场景是否有效
                if (!this.scene || this.health <= 0) {
                    // 如果不再有效，则移除 Timer
                    if (this.Timer) {
                        this.Timer.remove();
                    }
                    return;
                }
                const scene = this.scene;
                if (!scene || this.isSleeping) return;
                if (
                    scene.monsterSpawner.hasMonsterInRow(this.row)) {
                    this.shootAnimation();
                    this.scene?.frameTicker.delayedCall({
                        delay: 200,
                        callback: () => { shootArrow(this.scene, this); },
                    });
                }
            }
        });
    }

    public onStarShards(): void {
        super.onStarShards();

        this.removeTimer();
        const front = 35;
        const frontInterval = 50;
        const back = 5;
        this.Timer = this.bruteShootEvent(front, back, frontInterval);

        // 恢复
        const overallDuration = 200 + frontInterval * front;
        this.scene.frameTicker.delayedCall({
            delay: overallDuration,
            callback: () => {
                if (!this || !this.scene || this.health <= 0) return;

                this.removeTimer();
                this.Timer = this.normalShootEvent();
            }
        });


    }

    bruteShootEvent(front: number, back: number,
        frontInterval: number
    ): FrameTimer | null {
        // 如果对象或场景不存在，则直接返回 null
        if (!this.scene || this.health <= 0) {
            return null;
        }
        const scene = this.scene;

        const moveDistance = this.head.displayWidth * 0.15;
        const originalX = this.head.x;

        // Tween：先向左移动
        scene?.tweens.add({
            targets: this.head,
            x: originalX - moveDistance,
            duration: 200,
            ease: 'Sine.easeOut',
            // 动画完成后也不必在这里发射箭，发射逻辑由 Timer 控制
        });

        // 创建 Timer 事件：延迟 200ms 后开始暴力发射箭，每 50ms 一次
        const elapsed = Math.floor(front / back);
        let count_ctx = { count: 0 };
        const bruteTimer = scene.frameTicker.addEvent({
            startAt: 200,
            delay: frontInterval,
            repeat: front - 1,
            callback: (context) => {
                // 每次发射前判断对象是否存活
                if (!this.scene || this.health <= 0) {
                    this.removeTimer();
                    return;
                }
                // 向前发射普通箭矢
                shootFrontArrow(scene, this, 30);

                // 向后发射firework箭矢
                if (context.count % elapsed === 0) {
                    shootBackFirework(scene, this);
                }
                context.count++;
            },
            args: [count_ctx],
        });

        // 计算总持续时间：Tween 200ms + Timer 发射的时长
        const overallDuration = 200 + frontInterval * front;
        // 发射结束后回归 Tween
        scene.time.delayedCall(overallDuration, () => {
            if (!this.scene || this.health <= 0) {
                return;
            }
            this.scene?.tweens.add({
                targets: this.head,
                x: originalX,
                duration: 200,
                ease: 'Sine.easeIn'
            });
        });

        return bruteTimer;
    }

    destroy(fromScene?: boolean): void {
        this.head?.destroy();
        this.base?.destroy();
        super.destroy(fromScene);
    }
}



function shootArrow(scene: Game, shooter: IPlant) {
    const baseDamage = GetIncValue(ProjectileDamage.bullet.arrow, 1.3, shooter.level);
    shootBackArrow(scene, shooter, baseDamage);
    shootFrontArrow(scene, shooter, baseDamage);
}

function shootFrontArrow(scene: Game, shooter: IPlant, baseDamage: number = 30) {
    if (!scene || !shooter || shooter.health <= 0) {
        return;
    }
    const arrow1 = NewArrow(scene, shooter.col, shooter.row, scene.positionCalc.GRID_SIZEX * 32, baseDamage);
    arrow1.penetrate = 1;
}

function shootBackArrow(scene: Game, shooter: IPlant, baseDamage: number = 30) {
    if (!scene || !shooter || shooter.health <= 0) {
        return;
    }
    const arrow2 = NewArrow(scene, shooter.col, shooter.row, scene.positionCalc.GRID_SIZEX * 32, baseDamage);
    arrow2.setVelocityX(-300 * scene.positionCalc.scaleFactor);
    arrow2.penetrate = 1;

    scene.frameTicker.delayedCall({
        delay: 100,
        callback: () => {
            if (!scene || !shooter || shooter.health <= 0) {
                return;
            }
            const arrow3 = NewArrow(scene, shooter.col, shooter.row, scene.positionCalc.GRID_SIZEX * 32, baseDamage);
            arrow3.setVelocityX(-300 * scene.positionCalc.scaleFactor);
            arrow3.penetrate = 1;
        }
    });
}

function shootBackFirework(scene: Game, shooter: IPlant) {
    if (!scene || !shooter || shooter.health <= 0) {
        return;
    }

    const level = shooter.level;
    //  根据等级略微提高伤害
    const damage = GetIncValue(150, level, 1.2);
    const penetrate = 1;

    const arrow = NewHorizontalFireWork(scene, shooter.col, shooter.row, scene.positionCalc.GRID_SIZEX * 32, damage, 'zombie', 100);
    arrow.setVelocityX(-250 * scene.positionCalc.scaleFactor);
    arrow.penetrate = penetrate;
    return arrow;
}


function NewDoubleDispenser(scene: Game, col: number, row: number, level: number
): double_dispenser {
    return new double_dispenser(scene, col, row, DoubleDispenser_Record.texture, level);
}

function levelAndstuff(level: number): item[] {
    return [{
        type: SECKILL,
        count: 1
    }];
}

const DoubleDispenser_Record: IRecord = {
    pid: 16,
    name: "双头发射器",
    cost: (level?: number) => 125,
    cooldownTime: () => 10,
    NewFunction: NewDoubleDispenser,
    texture: "plant/double_dispenser",
    description: i18n.S('double_dispenser_description'),
    NextLevelStuff: levelAndstuff,
}

export default DoubleDispenser_Record;