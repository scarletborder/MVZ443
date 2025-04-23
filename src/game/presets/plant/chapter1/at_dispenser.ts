import { SECKILL } from "../../../../../public/constants";
import { item } from "../../../../components/shop/types";
import i18n from "../../../../utils/i18n";
import { GetIncValue } from "../../../../utils/numbervalue";
import { IExpolsion } from "../../../models/IExplosion";
import { IPlant } from "../../../models/IPlant";
import { IRecord } from "../../../models/IRecord";
import { Game } from "../../../scenes/Game";
import createShootBurst from "../../../sprite/shoot_anim";
import { FrameTimer } from "../../../sync/ticker";
import NewHorizontalFireWork, { HFireWork } from "../../bullet/firework";
import DispenserRecord from "./dispenser";


class at_dispenser extends IPlant {
    game: Game;
    base: Phaser.GameObjects.Sprite; // 底座，frame 0
    head: Phaser.GameObjects.Sprite; // 头部，frame 1
    container: Phaser.GameObjects.Container;

    headX: number;


    public onStarShards(): void {
        super.onStarShards();
        if (!this || !this.game) return;

        // 发射一颗高射烟花火箭
        new at_air_HFirework(this.game, this.col, this.row, 50, this.game.positionCalc.GRID_SIZEX * 4,
            'zombie', 300);
    }


    constructor(scene: Game, col: number, row: number, texture: string, level: number) {
        // 首先获得当前格子中作为基座的 发射器destroyPlant基座植物
        const key = `${col}-${row}`;
        const plants = scene.gardener.planted.get(key) || [];

        for (const plant of plants) {
            if (plant.pid === DispenserRecord.pid) { // 基座
                plant.destroyPlant();
                break;
            }
        }


        super(scene, col, row, texture, ATDispenserRecord.pid, level);
        this.setVisible(false);
        this.game = scene;
        const health = GetIncValue(450, 2, level);
        this.setHealthFirstly(health);

        // anim
        let size = scene.positionCalc.getPlantDisplaySize();
        // 头部：frame 1，初始位置与底座对齐
        this.head = scene.add.sprite(this.x, this.y, texture, 2).setOrigin(0.5, 1)
            .setDisplaySize(size.sizeX * 1.2, size.sizeY * 1.2).setDepth(this.depth);
        // 底座：frame 0
        this.base = scene.add.sprite(this.x, this.y, texture, 1).setOrigin(0.5, 1)
            .setDisplaySize(size.sizeX * 1.5, size.sizeY * 1.5).setDepth(this.depth - 1);
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
                        this.head.x + this.width * 2 / 9,
                        this.head.y - this.height * 2 / 3,
                        24,
                        this.depth + 2
                    );

                    createShootBurst(
                        this.scene,
                        this.head.x + this.width * 3 / 9,
                        this.head.y - this.height * 2 / 3,
                        24,
                        this.depth + 2
                    );

                    createShootBurst(
                        this.scene,
                        this.head.x + this.width * 2 / 9,
                        this.head.y - this.height * 1 / 3,
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
            startAt: 2500,
            delay: 3550,
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
                if (this.isSleeping) return;
                if (this.scene.monsterSpawner.hasMonsterInRowWithElastic(this.row)
                    || this.scene?.monsterSpawner.hasMonsterInRowAfterX(this.row, this.x)) {
                    this.shootAnimation();
                    this.scene?.frameTicker.delayedCall({
                        delay: 200,
                        callback: () => { shootArrow(this.scene, this); },
                    });
                }
            }
        });
    }

    destroy(fromScene?: boolean): void {
        this.head?.destroy();
        this.base?.destroy();
        super.destroy(fromScene);
    }
}

function NewATDispenser(scene: Game, col: number, row: number, level: number): IPlant {
    const peashooter = new at_dispenser(scene, col, row, 'plant/at_dispenser', level);
    return peashooter;
}

function shootArrow(scene: Game, shooter: IPlant, baseDamage: number = 300, isStar: boolean = false) {
    if (!scene || !shooter || shooter.health <= 0) {
        return;
    }

    const level = shooter.level;
    //  根据等级略微提高伤害
    const damage = GetIncValue(baseDamage, level, 1.4);
    const penetrate = 1;

    const arrow = NewHorizontalFireWork(scene, shooter.col, shooter.row, scene.positionCalc.GRID_SIZEX * 32, damage, 'zombie', 100);
    arrow.penetrate = penetrate;
    return arrow;
}


class at_air_HFirework extends HFireWork {
    destroy(fromScene?: boolean): void {
        const game = this.scene;
        const x = this.x;
        const row = this.row;
        const explodeDamage = this.explodeDamage;
        console.log('炸弹炸了', x, row, explodeDamage);
        super.destroy(fromScene);
        if (!game) return;

        const gridGap = game.positionCalc.GRID_SIZEX * 1.5;

        // 对多个角度设置爆炸
        new IExpolsion(game, x, row, {
            damage: explodeDamage,
            rightGrid: 1.5,
            leftGrid: 1.5,
            upGrid: 1,
        });

        new IExpolsion(game, x + gridGap, row + 2, {
            damage: explodeDamage,
            rightGrid: 1.5,
            leftGrid: 1.5,
            upGrid: 1,
        });

        new IExpolsion(game, x - gridGap, row + 2, {
            damage: explodeDamage,
            rightGrid: 1.5,
            leftGrid: 1.5,
            upGrid: 1,
        });

        new IExpolsion(game, x + gridGap, row - 2, {
            damage: explodeDamage,
            rightGrid: 1.5,
            leftGrid: 1.5,
            upGrid: 1,
        });

        new IExpolsion(game, x - gridGap, row - 2, {
            damage: explodeDamage,
            rightGrid: 1.5,
            leftGrid: 1.5,
            upGrid: 1,
        });
    }
}

function levelAndstuff(level: number): item[] {
    return [{
        type: SECKILL,
        count: 1
    }];
}

const ATDispenserRecord: IRecord = {
    pid: 14,
    name: '反坦克炮台',
    cost: (level) => {
        if (level && level >= 5) return 425;
        return 450;
    },
    cooldownTime: (level) => {
        if (level && level >= 9) return 48;
        return 60;
    },
    NewFunction: NewATDispenser,
    texture: 'plant/at_dispenser',
    description: i18n.S('at_dispenser'),
    NextLevelStuff: levelAndstuff
};

export default ATDispenserRecord;
