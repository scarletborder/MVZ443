import { SECKILL } from "../../../../public/constants";
import { item } from "../../../components/shop/types";
import i18n from "../../../utils/i18n";
import { GetIncValue } from "../../../utils/numbervalue";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";
import createShootBurst from "../../sprite/shoot_anim";
import { AddEventConfig, FrameTimer } from "../../sync/ticker";
import NewArrow from "../bullet/arrow";

class dispenser extends IPlant {
    game: Game;
    base: Phaser.GameObjects.Sprite; // 底座，frame 0
    head: Phaser.GameObjects.Sprite; // 头部，frame 1
    container: Phaser.GameObjects.Container;

    headX: number;

    isInBruteShoot = false;

    public onStarShards(): void {
        super.onStarShards();

        const totalArrows = 50; // Total number of arrows to shoot

        // 如果存在 Timer，则先移除（防止多重 Timer 并存）
        this.removeTimer();

        // 开始暴力发射，并保存 Timer
        this.Timer = this.bruteShootEvent(totalArrows);
        // 根据暴力发射的总时长，发射结束后恢复 normalShootEvent
        const overallDuration = 200 + 50 * (totalArrows - 1);
        this.game.time.delayedCall(overallDuration, () => {
            // 再次判断对象是否有效
            if (!this || !this.scene || this.health <= 0) {
                return;
            }
            this.removeTimer();
            this.Timer = this.normalShootEvent();
        });
    }


    constructor(scene: Game, col: number, row: number, texture: string, level: number) {
        super(scene, col, row, texture, DispenserRecord.pid, level);
        this.setVisible(false);
        this.game = scene;
        this.setHealthFirstly(300);

        // anim
        let size = scene.positionCalc.getPlantDisplaySize();
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

        return this.scene.frameTicker.addEvent(
            {
                startAt: 800,
                delay: 1000,
                repeat: -1,
                callback: () => {
                    // 这里先判断对象及场景是否有效
                    if (!this.scene || this.health <= 0) {
                        // 如果不再有效，则移除 Timer
                        if (this.Timer) {
                            this.Timer.remove();
                        }
                        return;
                    }
                    if (this.scene?.monsterSpawner.hasMonsterInRowAfterX(this.row, this.x)) {
                        this.shootAnimation();
                        this.scene?.frameTicker.delayedCall({
                            delay: 200,
                            callback: () => { shootArrow(this.scene, this); },
                        })
                    }
                },
            })
    }

    bruteShootEvent(totalArrows: number): FrameTimer | null {
        // 如果对象或场景不存在，则直接返回 null
        if (!this.scene || this.health <= 0) {
            return null;
        }
        const scene = this.scene;
        this.isInBruteShoot = true;

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
        const bruteTimer = this.game.frameTicker.addEvent({
            startAt: 200,
            delay: 50,
            repeat: totalArrows - 1,
            callback: () => {
                // 每次发射前判断对象是否存活
                if (!this.scene || this.health <= 0) {
                    this.removeTimer();
                    return;
                }
                shootArrow(this.game, this, 32, true);
            }
        });

        // 计算总持续时间：Tween 200ms + Timer 发射的时长
        const overallDuration = 200 + 50 * (totalArrows - 1);
        // 发射结束后回归 Tween
        scene.time.delayedCall(overallDuration, () => {
            this.isInBruteShoot = false;
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

function NewDispenser(scene: Game, col: number, row: number, level: number): IPlant {
    const peashooter = new dispenser(scene, col, row, 'plant/dispenser', level);
    return peashooter;
}

function shootArrow(scene: Game, shooter: IPlant, baseDamage: number = 30, isStar: boolean = false) {
    if (!scene || !shooter || shooter.health <= 0) {
        return;
    }

    const level = shooter.level;
    //  根据等级略微提高伤害
    let damage = GetIncValue(baseDamage, level, 1.35);
    let penetrate = 1;
    if (level >= 3) {
        penetrate += 1;
        // if (level >= 7) {
        //     penetrate += 1;
        // }
        if (level >= 5 && isStar) {
            penetrate += 1;
            damage *= 0.85;
        }
    }

    const arrow = NewArrow(scene, shooter.col, shooter.row, scene.positionCalc.GRID_SIZEX * 32, damage);
    arrow.penetrate = penetrate;
    return arrow;
}
function levelAndstuff(level: number): item[] {
    switch (level) {
        case 1:
            return [{
                type: 1,
                count: 100
            }, {
                type: 2,
                count: 1
            }];
        case 2:
            return [{
                type: 1,
                count: 200
            }, {
                type: 2,
                count: 4
            }, {
                type: 3,
                count: 1
            }];
        case 3:
            return [
                {
                    type: 1,
                    count: 400
                }, {
                    type: 3,
                    count: 6
                }, {
                    type: 4,
                    count: 1
                }];
        case 4:
            return [{
                type: 1,
                count: 650
            }, {
                type: 3,
                count: 8
            }, {
                type: 4,
                count: 1
            }, {
                type: 5,
                count: 1
            }];


    }
    return [{
        type: SECKILL,
        count: 1
    }];
}

const DispenserRecord: IRecord = {
    pid: 1,
    name: '发射器',
    cost: (level) => {
        if (level && level >= 5) return 75;
        return 100;
    },
    cooldownTime: () => 6,
    NewFunction: NewDispenser,
    texture: 'plant/dispenser',
    description: i18n.S('dispenser_description'),
    NextLevelStuff: levelAndstuff
};

export default DispenserRecord;
