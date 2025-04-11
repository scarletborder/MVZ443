// enhanced golem preset
// not for boss, but for normal monster
// 提供给如 "突变僵尸", "重炮突变僵尸" 这样的僵尸使用

import DepthManager from "../../../utils/depth";
import { IPlant } from "../../models/IPlant";
import { IMonster } from "../../models/monster/IMonster";
import { Game } from "../../scenes/Game";
import IMutantAnim from "../../sprite/zombie_mutant";
import { FrameTimer } from "../../sync/ticker";

export default class IMutant extends IMonster {
    // 动画
    anim: IMutantAnim
    baseDepth: number;

    // 逻辑
    isAttacking: boolean = false;
    isDying: boolean = false;
    attackedPlants: IPlant[] = [];
    preAttackedPlants: IPlant | null = null;

    // 定时器
    attackTimer: FrameTimer | null = null;

    constructor(scene: Game, col: number, row: number, waveID: number,
        newAnim: (scene: Game, x: number, y: number) => IMutantAnim) {
        super(scene, col, row, waveID);
        const x = this.x;
        const y = this.y;

        this.anim = newAnim(scene, x, y);
        this.baseDepth = DepthManager.getZombieBasicDepth(row, 0);
        this.setDepth();

        this.couldCarryStarShards = true;
    }

    setDepth(): this {
        this.anim.setDepth(this.baseDepth);
        return this;
    }

    startAttacking(plant: IPlant) {
        if (this.health <= 0 || !this.game || this.IsFrozen) return;

        // 已经在攻击你了
        if (this.attackedPlants.includes(plant) || this.preAttackedPlants === plant) return;

        // 首先判断是否已经在攻击plant
        if (this.isAttacking && this.attackedPlants.length > 0) {
            // 如果有,判断是否在同一个格子内
            if (this.attackedPlants[0].col === plant.col &&
                this.attackedPlants[0].row === plant.row) {
                // 如果在一个格子内,加入即将秒杀的array,在本次攻击流程结束后,一起把这个plant给秒杀了
                this.attackedPlants.push(plant);
                return;
            } else {
                // 如果不在,那么将他加入即将攻击目标,如果即将攻击目标已经存在了,那么忽视此次碰撞
                if (this.preAttackedPlants) return;
                this.preAttackedPlants = plant;
                return;
            }
            // 在攻击流程结束后,查看是否有即将攻击目标,如果有,那么继续攻击,否则往前行驶
            return;
        } else {
            // 如果没有,那么直接攻击
            this.attackedPlants.push(plant);
            this.startAttackProcess();
        }
        return;
    }

    startAttackProcess() {
        if (!this || !this.game) return;
        this.StopMove();

        // 存储
        const scene = this.game;
        const preDamagedPlants = [...this.attackedPlants];

        // 开始一次完整的攻击流程,包括动画和挥舞,然后到造成伤害
        this.isAttacking = true;
        try {
            // 手臂动作
            this.anim.startLeftArmSmash(() => { });

            this.attackTimer = scene.frameTicker.delayedCall(
                {
                    delay: 1500,
                    callback: () => {
                        if (this.health <= 0 || !this.game || this.IsFrozen) return;

                        const grids: Set<string> = new Set();
                        preDamagedPlants.forEach(plant => {
                            plant.takeDamage(5500, this);
                            const key = `${plant.col}-${plant.row}`;
                            grids.add(key);
                        });

                        // 删除所有grids key
                        grids.forEach(key => {
                            const plant = this.game.gardener.planted.get(key);
                            if (plant && plant.length > 0) {
                                plant.forEach(p => {
                                    p.takeDamage(5500, this);
                                });
                            }
                        });

                        scene.frameTicker.delayedCall({
                            delay: 1500,
                            callback: () => {
                                if (!this || this.health <= 0 || !this.game || this.IsFrozen) return;

                                this.attackedPlants = [];
                                if (this.preAttackedPlants) {
                                    this.attackedPlants.push(this.preAttackedPlants);
                                    this.preAttackedPlants = null;
                                    this.startAttackProcess();
                                } else {
                                    this.isAttacking = false;
                                    this.StartMove();
                                }
                            }
                        })

                    }
                }
            );
        } finally {
            if (!this) return;
        }

    }

    // 冻结停止所有动作
    stopAllAction() {
        if (this.attackTimer) {
            this.attackTimer.remove();
            this.attackTimer = null;
        }
        this.isAttacking = false;
        this.attackedPlants = [];
        this.preAttackedPlants = null;
    }

    public catchDebuff(debuff: 'slow' | 'frozen', duration: number) {
        if (this.health <= 0 || !this.game) return;
        if (debuff === 'slow') {
            console.log('slow');
            this.anim.startSlowEffect();
            // 如果 debuff 已存在，则更新剩余时间和定时器
            if (this.debuffs[debuff]) {
                this.debuffs[debuff].remaining = Math.max(this.debuffs[debuff].timer.getRemaining(), duration);
                this.debuffs[debuff].timer.reset({
                    delay: this.debuffs[debuff].remaining,
                    callback: () => this.removeDebuff(debuff),
                    callbackScope: this
                });
            } else {
                this.debuffs[debuff] = {
                    remaining: duration,
                    timer: this.game.time.delayedCall(duration, () => this.removeDebuff(debuff), [], this)
                };
            }
            // 仅在不处于 frozen 状态下应用 slow 效果
            if (!this.IsFrozen) {
                this.speed = this.originalSpeed * 0.6;
                if (!this.isAttacking
                    && this.attackedPlants.length === 0
                    && this.preAttackedPlants === null) this.StartMove();

            }
        } else if (debuff === 'frozen') {
            console.log('frozen');
            this.anim.startFrozenEffect();
            // 如果 frozen 已存在，则更新剩余时间和定时器
            if (this.debuffs[debuff]) {
                this.debuffs[debuff].remaining = Math.max(this.debuffs[debuff].timer.getRemaining(), duration);
                this.debuffs[debuff].timer.reset({
                    delay: this.debuffs[debuff].remaining,
                    callback: () => this.removeDebuff(debuff),
                    callbackScope: this
                });
            } else {
                this.debuffs[debuff] = {
                    remaining: duration,
                    timer: this.game.time.delayedCall(duration, () => this.removeDebuff(debuff), [], this)
                };
            }
            // frozen 的优先级更高：直接冻结
            this.IsFrozen = true;
            this.speed = 0;
            try {
                this.stopAllAction();
                this.StopMove();
            } catch (e) {
                console.warn(e);
            }
        }
    }

    // 修改 removeDebuff，处理 frozen 移除后的恢复逻辑
    removeDebuff(debuff: 'slow' | 'frozen') {
        if (this.health <= 0 || !this.game) return;

        if (debuff === 'slow') {
            if (this.debuffs[debuff]) {
                delete this.debuffs[debuff];
            }
            // 如果当前不处于 frozen 状态，则恢复速度
            if (!this.IsFrozen) {
                this.speed = this.originalSpeed;
                if (!this.isAttacking
                    && this.attackedPlants.length === 0
                    && this.preAttackedPlants === null)
                    this.StartMove();
            }
            this.anim.stopSlowEffect();
        } else if (debuff === 'frozen') {
            if (this.debuffs[debuff]) {
                delete this.debuffs[debuff];
            }
            // 清除 frozen 效果
            this.IsFrozen = false;
            this.anim.stopFrozenEffect();
            // 判断是否还有 slow 存在：有则恢复 slow 速度，否则恢复原速
            if (this.debuffs['slow']) {
                this.speed = this.originalSpeed * 0.6;
            } else {
                this.speed = this.originalSpeed;
            }

            // 重置所有攻击目标
            this.attackedPlants = [];
            this.preAttackedPlants = null;

            if (!(!this.isAttacking
                && this.attackedPlants.length === 0
                && this.preAttackedPlants === null))
                this.StartMove();

        }
    }

    public update(...args: any[]): void {
        this.anim.updatePosition(this.x, this.y);
    }

    public takeDamage(damage: number, projectileType?: "bullet" | "laser" | "explosion" | "trajectory") {
        const realDamage = damage;
        super.takeDamage(realDamage, projectileType);
    }

    public setHealth(health: number) {
        if (this.health > health) {
            this.anim.highlight();
        }
        super.setHealth(health);

        // TODO: 根据血量不同显示不同的贴图状态
        // 要加上各个肢体的
        if (this.health >= this.maxHealth / 2) {
            this.anim.body.setFrame(0);
        } else if (this.health > 0) {
            this.anim.body.setFrame(1);
        }

        if (this.health <= 0) {
            this.destoryZombie();
        }
    }

    public StartMove() {
        this.setVelocityX(-this.speed);
        this.anim.startLegSwing();
        this.anim.startArmSwing();
    }

    public StopMove() {
        this.setVelocityX(0);
        this.anim.stopLegSwing();
    }

    destoryZombie() {
        // Ensure we don't proceed if this object is already destroyed or undefined
        if (!this || !this.game || !this.anim) return;

        // 删除物理效果
        if (this.body) {
            this.body.enable = false;
            this.game.physics.world.remove(this.body);
        }

        this.isDying = true; // 标记为死亡状态，避免其他逻辑干扰
        this.StopMove(); // 停止移动
        this.stopAllAction(); // 停止所有动作（如攻击）

        // 播放死亡烟雾动画
        this.playDeathSmokeAnimation(this.baseDepth);

        const scene = this.game;
        const anim = this.anim;

        // 停止所有现有动画
        scene.tweens.killTweensOf([
            anim.body,
            anim.head,
            anim.upperArmLeft,
            anim.upperArmRight,
            anim.upperLegLeft,
            anim.upperLegRight,
            anim.lowerArmLeft,
            anim.lowerArmRight,
            anim.lowerLegLeft,
            anim.lowerLegRight
        ]);
        anim.stopArmSwing();
        anim.stopLegSwing();

        // 死亡动画：向前倒地
        const duration = 1500; // 总动画时间 1.5 秒

        // 1. 身体向前倾斜到 90°（顺时针）
        scene.tweens.add({
            targets: anim.body,
            angle: 120, // 身体向前倒地
            y: anim.y + anim.body.displayHeight * 0.5, // 调整 Y 位置，使底部贴地
            duration: duration,
            ease: 'Sine.easeIn', // 先慢后快，模拟重力坠落
            onUpdate: () => {
                anim.updatePosition(this.x, this.y); // 同步更新所有部件位置
            }
        });

        // 2. 头部跟随身体倾斜并略微前倾
        scene.tweens.add({
            targets: anim.head,
            angle: 140, // 比身体多倾斜一点，模拟头部下垂
            duration: duration,
            ease: 'Sine.easeIn'
        });

        // 3. 手臂自然下垂（左臂和右臂）
        scene.tweens.add({
            targets: anim.upperArmLeft,
            angle: 120, // 手臂垂直向下
            duration: duration * 0.8, // 手臂比身体稍快完成
            ease: 'Sine.easeInOut'
        });
        scene.tweens.add({
            targets: anim.lowerArmLeft,
            angle: 120, // 下臂也垂直
            duration: duration * 0.8,
            ease: 'Sine.easeInOut'
        });
        scene.tweens.add({
            targets: anim.upperArmRight,
            angle: 120,
            duration: duration * 0.8,
            ease: 'Sine.easeInOut'
        });
        scene.tweens.add({
            targets: anim.lowerArmRight,
            angle: 120,
            duration: duration * 0.8,
            ease: 'Sine.easeInOut'
        });

        // 4. 腿部稍微弯曲后下垂
        scene.tweens.add({
            targets: anim.upperLegLeft,
            angle: 45, // 腿部稍微弯曲
            duration: duration * 0.6,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                scene.tweens.add({
                    targets: anim.upperLegLeft,
                    angle: 120, // 最终垂直
                    duration: duration * 0.4,
                    ease: 'Sine.easeIn'
                });
            }
        });
        scene.tweens.add({
            targets: anim.lowerLegLeft,
            angle: 120,
            duration: duration * 0.8,
            ease: 'Sine.easeInOut'
        });
        scene.tweens.add({
            targets: anim.upperLegRight,
            angle: 45,
            duration: duration * 0.6,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                scene.tweens.add({
                    targets: anim.upperLegRight,
                    angle: 120,
                    duration: duration * 0.4,
                    ease: 'Sine.easeIn'
                });
            }
        });
        scene.tweens.add({
            targets: anim.lowerLegRight,
            angle: 120,
            duration: duration * 0.8,
            ease: 'Sine.easeInOut'
        });

        // 动画完成后清理
        scene.time.delayedCall(duration, () => {
            if (!this || !this.anim) return;

            // 销毁所有部件
            if (anim.body) anim.body.destroy();
            if (anim.head) anim.head.destroy();
            if (anim.upperArmLeft) anim.upperArmLeft.destroy();
            if (anim.upperArmRight) anim.upperArmRight.destroy();
            if (anim.lowerArmLeft) anim.lowerArmLeft.destroy();
            if (anim.lowerArmRight) anim.lowerArmRight.destroy();
            if (anim.upperLegLeft) anim.upperLegLeft.destroy();
            if (anim.upperLegRight) anim.upperLegRight.destroy();
            if (anim.lowerLegLeft) anim.lowerLegLeft.destroy();
            if (anim.lowerLegRight) anim.lowerLegRight.destroy();

            // 清理手臂和腿部动画数组
            anim.armTweens = [];
            anim.legTweens = [];

            // 清理附加对象
            if (anim.handObject) {
                anim.handObject.destroy();
                anim.handObject = null;
            }
            if (anim.backObject) {
                anim.backObject.destroy();
                anim.backObject = null;
            }

            // 清理攻击计时器和 debuff
            if (this.attackTimer) {
                this.attackTimer.remove();
                this.attackTimer = null;
            }
            for (const debuff in this.debuffs) {
                if (this.debuffs[debuff] && this.debuffs[debuff].timer) {
                    this.debuffs[debuff].timer.remove();
                }
            }
            this.debuffs = {};

            // 最后销毁僵尸本身
            this.destroy();
        });
    }







}
