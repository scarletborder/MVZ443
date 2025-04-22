/**
 *  双头发射器
 */

import { SECKILL } from "../../../../../public/constants";
import { item } from "../../../../components/shop/types";
import { IPlant } from "../../../models/IPlant";
import { IRecord } from "../../../models/IRecord";
import { Game } from "../../../scenes/Game";
import createShootBurst from "../../../sprite/shoot_anim";
import { FrameTimer } from "../../../sync/ticker";

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

                    shootArrow(this.scene, this);

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
            delay: 1200,
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
                if (!scene) return;
                if (
                    scene.monsterSpawner.hasMonsterInRowWithElastic(this.row)
                    || scene.monsterSpawner.hasMonsterInRowAfterX(this.row, this.x)) {
                    this.shootAnimation();
                }
            }
        });
    }
}

function shootArrow(scene:Game, shooter:IPlant, baseDamage: number = 30) {
    
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
    description: () => "双头发射器",
    NextLevelStuff: levelAndstuff,
}