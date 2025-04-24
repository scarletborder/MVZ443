import { _Typedebuffs } from "../../../constants/game";
import DepthManager from "../../../utils/depth";
import { defaultRandom } from "../../../utils/random";
import { EventBus } from "../../EventBus";
import { Game } from "../../scenes/Game";
import IZombieAnim from "../../sprite/zombie";
import { FrameTimer } from "../../sync/ticker";
import { IPlant } from "../IPlant";
import { IMonster } from "./IMonster";



// 长得像普通僵尸的,比如各种变种僵尸,骷髅,灾厄村民
export class IZombie extends IMonster {
    public IsFrozen: boolean = false;
    public IsStop: boolean = false;


    // 是否是召唤的僵尸(击杀不计数), waveID < 0 即召唤物

    // 攻击
    private attackTimer: FrameTimer | null = null; // 攻击定时器
    public attackingPlant: IPlant | null = null; // 当前攻击的植物
    public attackInterval: number = 200; // 攻击间隔
    public attackDamage: number = 20; // 攻击伤害

    // 附加物体
    public zombieAnim: IZombieAnim;
    public attachSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();


    // 动画
    isDying: boolean = false; // 是否正在死亡
    offsetX: number = 0; // 动画偏移量,一个微小的偏移避免视觉在一起
    offsetY: number = 0;

    baseDepth: number


    // 没必要以后特定texture了,因为反正设置了不可见
    constructor(scene: Game, col: number, row: number, texture: string, waveID: number,
        newZombieAnim: (scene: Game, x: number, y: number) => IZombieAnim) {
        super(scene, col, row, waveID); // 没必要以后特定texture了,因为反正设置了不可见

        this.couldCarryStarShards = true;

        const x = this.x;
        const y = this.y;

        this.zombieAnim = newZombieAnim(scene, x, y);
        this.offsetX = defaultRandom() * scene.positionCalc.GRID_SIZEX / 5;
        this.offsetY = defaultRandom() * scene.positionCalc.GRID_SIZEY / 10;
        this.baseDepth = DepthManager.getZombieBasicDepth(row, this.offsetY);

        this.SetSpeedFirstly(20);
        this.setDepth();

        this.zombieAnim.startLegSwing();

        // 免费的附带物体之,boat
        // 如果某一行有一个water,那么就有boat
        if (scene.gardener.GridClan.RowPropertyRatio(row, 'water') > 0) {
            const boaty = y + 15 * scene.positionCalc.scaleFactor;
            const boat1 = scene.physics.add.sprite(x, boaty, 'attach/boat1');
            boat1.setScale(scene.positionCalc.scaleFactor * 1.4).setOrigin(0.5, 1);
            boat1.setFrame(0);
            boat1.debugShowBody = false;
            scene.physics.add.existing(boat1);
            boat1.setVisible(true);
            this.attachSprites.set('boat1', boat1);
            boat1.setDepth(this.baseDepth - 2);

            const boat2 = scene.physics.add.sprite(x, boaty, 'attach/boat2');
            boat2.setScale(scene.positionCalc.scaleFactor * 1.4).setOrigin(0.5, 1);
            boat2.setFrame(0);
            boat2.debugShowBody = false;
            scene.physics.add.existing(boat2);
            boat2.setVisible(true);
            this.attachSprites.set('boat2', boat2);
            boat2.setDepth(this.baseDepth + 10);
        }
    }

    // 设置生命值并监听
    public setHealth(value: number) {
        if (value < this.health) this.zombieAnim.highlight();
        super.setHealth(value);
        if (this.health <= 0) {
            this.destroyZombie();
        }
    }

    // 受到伤害
    public takeDamage(amount: number, projectileType?: "bullet" | "laser" | "explosion" | "trajectory") {
        const realDamage = amount;
        super.takeDamage(realDamage, projectileType);
    }

    // 开始攻击植物
    public startAttacking(plant: IPlant) {
        if (this.attackingPlant === plant) return; // 就是正在攻击碰到的植物,避免重复启动

        if (this.IsFrozen) return; // 冻结状态不能攻击

        // 由别的植物导致的碰撞
        // 判断优先级,更换attackingPlant
        // 碰撞就会产生的函数
        // 如果在攻击过程中新增了碰撞(正在attacking的不为空),那么判断有了更加优先级的目标(南瓜)
        if (this.attackingPlant) {
            if (IZombie.GridClan.MorePriorityPlant(this.attackingPlant, plant)) {
                this.broadcastToPlant(); // 停止攻击原有的植物
                this.attackingPlant = plant; // 更换新植物
            }
            return;
        }

        // 新的攻击流程开始
        this.attackingPlant = plant;
        this.IsStop = true;
        this.StopMove();
        plant.attackingZombie.add(this);
        console.log('Zombie started attacking plant');
        this.zombieAnim.startArmSwing();
        this.zombieAnim.stopLegSwing();

        // 启动攻击定时器
        this.attackTimer = this.game.frameTicker.addEvent({
            startAt: this.attackInterval * 9 / 10,
            delay: this.attackInterval,
            callback: () => this.hurtPlant(),
            loop: true,
        });
    }

    // 通知正在被攻击的植物,我停止攻击
    public broadcastToPlant() {
        this.attackingPlant?.attackingZombie.delete(this);
        this.attackingPlant = null;
    }
    // 停止攻击
    public stopAttacking() {
        this.attackingPlant = null;

        this.zombieAnim?.stopArmSwing();
        this.zombieAnim?.startLegSwing();
        if (this.attackTimer) {
            this.attackTimer.remove();
            this.attackTimer = null;
        }
        this.broadcastToPlant();
        this.IsStop = false;
        this.StartMove();
        console.log('Zombie stopped attacking');
    }

    // 移动相关
    // catchDebuff函数，处理增加debuff
    public catchDebuff(debuff: _Typedebuffs, duration: number) {
        if (this.health <= 0 || !this.game) return;
        const game = this.game;
        if (!game) return;

        if (debuff === 'slow') {
            console.log('slow');
            this.updateDebuffTime('slow', duration);
            // 仅在不处于 frozen 状态下应用 slow 效果
            if (!this.IsFrozen) {
                this.zombieAnim.startSlowEffect();
                this.speed = this.originalSpeed * 0.6;
                if (!this.attackingPlant)
                    this.StartMove();
            }
        } else if (debuff === 'frozen') {
            console.log('frozen');
            this.zombieAnim.startFrozenEffect();
            // 如果 frozen 已存在，则更新剩余时间和定时器
            this.updateDebuffTime('frozen', duration);
            // frozen 的优先级更高：直接冻结
            this.IsFrozen = true;
            this.speed = 0;
            this.stopAttacking();
            this.StopMove();
        }

        super.catchDebuff(debuff, duration);
    }

    // 修改 removeDebuff，处理 frozen 移除后的恢复逻辑
    removeDebuff(debuff: _Typedebuffs) {
        if (this.health <= 0 || !this.game) return;

        if (debuff === 'slow') {
            if (this.debuffs[debuff]) {
                delete this.debuffs[debuff];
            }
            // 如果当前不处于 frozen 状态，则恢复速度
            if (!this.IsFrozen) {
                this.speed = this.originalSpeed;
                if (!this.attackingPlant)
                    this.StartMove();
            }
            this.zombieAnim.stopSlowEffect();
        } else if (debuff === 'frozen') {
            if (this.debuffs[debuff]) {
                delete this.debuffs[debuff];
            }
            // 清除 frozen 效果
            this.IsFrozen = false;
            this.zombieAnim.stopFrozenEffect();
            // 判断是否还有 slow 存在：有则恢复 slow 速度，否则恢复原速
            if (this.debuffs['slow']) {
                this.speed = this.originalSpeed * 0.6;
                this.zombieAnim.startSlowEffect();
            } else {
                this.speed = this.originalSpeed;
            }
            if (!this.attackingPlant)
                this.StartMove();
        }

        super.removeDebuff(debuff);
    }

    public StartMove() {
        if (this.IsFrozen) return;
        if (this.IsStop) return;
        this.setVelocityX(-this.speed);
        this.zombieAnim.startLegSwing();
    }

    public StopMove() {
        this.setVelocityX(0);
        this.zombieAnim.stopLegSwing();
    }

    setVelocityX(speed: number) {
        if (!super.setVelocityX || (this.health <= 0 && this.isDying)) {
            return this;
        }
        super.setVelocityX(speed);
        this.attachSprites.forEach(sprite => {
            if (!sprite || !sprite.setVelocityX) return;
            sprite.setVelocityX(speed);
        });
        return this;
    }

    // 伤害植物
    public hurtPlant() {
        if (this.attackingPlant && this.attackingPlant.active && this.attackingPlant.health > 0) {
            this.attackingPlant.takeDamage(this.attackDamage, this);
            if (!this.attackingPlant) return;
            if (this.attackingPlant.health <= 0) {
                this.stopAttacking();
            }
        } else if (!this.attackingPlant || this.attackingPlant.health <= 0) {
            this.stopAttacking();
        }
    }

    // 销毁僵尸
    public destroyZombie() {
        // 通知正在收到攻击的植物
        this.attackingPlant?.attackingZombie.delete(this);

        if (this.attackTimer) {
            this.attackTimer.remove();
            this.attackTimer = null;
        }
        this.playDeathAnimation();
        console.log('Zombie destroyed');
    }

    playDeathAnimation() {
        this.isDying = true;
        this.setVelocityX(0);
        this.zombieAnim.stopArmSwing();
        this.zombieAnim.stopLegSwing();
        // 移除物理效果
        if (this.body) {
            this.body.enable = false;
            this.game.physics.world.remove(this.body);

            this.setOrigin(0.5, 1);
            this.zombieAnim.setOrigin(0.5, 1); // Sync origin with physics sprite

            this.game.tweens.add({
                targets: [this, this.zombieAnim.body, this.zombieAnim.head,
                    this.zombieAnim.armLeft, this.zombieAnim.armRight,
                    this.zombieAnim.legLeft, this.zombieAnim.legRight],
                angle: 90,
                duration: 400,
                ease: 'Linear',
                onComplete: () => {
                    this.playDeathSmokeAnimation(this.zombieAnim.head.depth);
                    this.destroy();
                }
            });
        }
    }

    carryStar() {
        // 携带星之碎片
        this.zombieAnim.twinkle();
        super.carryStar();
    }

    // 覆盖 destroy 方法，确保清理
    destroy(fromScene?: boolean) {
        if (this.attackTimer) {
            this.attackTimer.remove();
            this.attackTimer = null;
        }
        // 处理attach
        this.zombieAnim.destroy();
        this.attachSprites.forEach(sprite => sprite.destroy());
        if (this.carryStarShards) {
            EventBus.emit('starshards-get');
        }
        super.destroy(fromScene);
    }

    // 每帧更新
    update() {
        if (!this.isDying) {
            this.zombieAnim.updatePosition(this.x + this.offsetX, this.y + this.offsetY);
        }
        // 超越边界销毁
        if (this.Rank === 'normal' && this.x < - IZombie.GridClan.gardener.positionCalc.GRID_SIZEX * 1) {
            console.log('Zombie out of boundary');
            // 游戏直接失败,结束游戏
            // 矿车可以被碰撞,如果丢,早丢了
            this.destroy();
            EventBus.emit('game-fail');
        }
    }

    updateAttachPosition() { }

    setDepth() {
        this.zombieAnim.setDepth(this.baseDepth);
        return this;
    }
}