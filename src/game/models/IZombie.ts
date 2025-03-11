import DepthManager from "../../utils/depth";
import { EventBus } from "../EventBus";
import { Game } from "../scenes/Game";
import IZombieAnim from "../sprite/zombie";
import MonsterSpawner from "../utils/spawner";
import { IPlant } from "./IPlant";

function setDisplay(spr: IZombie, scene: Game) {
    let size = scene.positionCalc.getZombieBodySize();
    spr.setBodySize(size.sizeX, size.sizeY * 0.9);
    size = scene.positionCalc.getZombieDisplaySize();
    spr.setDisplaySize(size.sizeX, size.sizeY);
    spr.setOffset(10 * scene.positionCalc.scaleFactor, + 20 * scene.positionCalc.scaleFactor);
    spr.setOrigin(0.5, 1);
}

export class IZombie extends Phaser.Physics.Arcade.Sprite {
    public static Group: Phaser.Physics.Arcade.Group;
    private Spawner: MonsterSpawner;

    // 私有
    // 属性
    public health: number;
    public speed: number;
    public IsFrozen: boolean = false;
    public IsStop: boolean = false;

    public isFlying: boolean = false; // 是否在天上
    public isInVoid: boolean = false; // 是否是灵魂状态

    // 攻击
    private attackTimer?: Phaser.Time.TimerEvent; // 攻击定时器
    public attackingPlant: IPlant | null = null; // 当前攻击的植物
    private attackInterval: number = 160; // 攻击间隔
    private attackDamage: number = 15; // 攻击伤害

    // 附加物体
    public zombieAnim: IZombieAnim;
    public attachSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();

    public col: number;
    public row: number;

    // 动画
    isDying: boolean = false; // 是否正在死亡
    offsetX: number = 0; // 动画偏移量,一个微小的偏移避免视觉在一起
    offsetY: number = 0;

    baseDepth: number

    static InitGroup(scene: Game) {
        this.Group = scene.physics.add.group({
            classType: IZombie,
            runChildUpdate: true
        });
    }

    // 没必要以后特定texture了,因为反正设置了不可见
    constructor(scene: Game, col: number, row: number, texture: string,
        newZombieAnim: (scene: Game, x: number, y: number) => IZombieAnim) {
        const { x, y } = scene.positionCalc.getZombieBottomCenter(col, row);
        super(scene, x, y, texture, 0); // 没必要以后特定texture了,因为反正设置了不可见
        this.setVisible(false);

        this.zombieAnim = newZombieAnim(scene, x, y);
        this.offsetX = Math.random() * scene.positionCalc.GRID_SIZEX / 5;
        this.offsetY = Math.random() * scene.positionCalc.GRID_SIZEY / 10;
        this.baseDepth = DepthManager.getZombieBasicDepth(row, this.offsetY);
        this.setDepth();

        this.zombieAnim.startLegSwing();

        scene.add.existing(this);
        scene.physics.add.existing(this);

        setDisplay(this, scene);


        IZombie.Group.add(this, true);
        this.health = 20; // 默认血量

        this.col = col;
        this.row = row;
        this.isDying = false;
        this.isFlying = false;
        this.isInVoid = false;

        this.Spawner = scene.monsterSpawner;
        this.Spawner.registerMonster(this);
    }

    // 设置生命值并监听
    public setHealth(value: number) {
        this.health = value;
        if (this.health <= 0) {
            this.destroyZombie();
        }
    }

    // 受到伤害
    public takeDamage(amount: number) {
        this.setHealth(this.health - amount);
    }

    // 开始攻击植物
    public startAttacking(plant: IPlant) {
        if (this.attackingPlant === plant) return; // 就是正在攻击碰到的植物,避免重复启动

        // TODO: 由别的植物导致的碰撞
        // 判断优先级,更换attackingPlant
        // 碰撞就会产生的函数
        // 如果在攻击过程中新增了碰撞(正在attacking的不为空),那么判断有了更加优先级的目标(南瓜)
        if (this.attackingPlant) return;  // 目前直接忽略


        this.attackingPlant = plant;
        this.IsStop = true;
        this.setVelocityX(0);
        plant.attackingZombie.add(this);
        console.log('Zombie started attacking plant');
        this.zombieAnim.startArmSwing();
        this.zombieAnim.stopLegSwing();

        // 启动攻击定时器
        this.attackTimer = this.scene.time.addEvent({
            startAt: this.attackInterval * 4 / 5,
            delay: this.attackInterval,
            callback: () => this.hurtPlant(),
            loop: true,
        });
    }

    // 停止攻击
    public stopAttacking() {
        // 通知正在被攻击的植物
        this.zombieAnim?.stopArmSwing();
        this.zombieAnim?.startLegSwing();
        this.attackingPlant?.attackingZombie.delete(this);

        if (this.attackTimer) {
            this.attackTimer.remove();
            this.attackTimer.destroy();
            this.attackTimer = undefined;
        }
        this.attackingPlant = null;
        this.IsStop = false;
        this.setVelocityX(-this.speed);
        console.log('Zombie stopped attacking');
    }

    setVelocityX(speed: number) {
        if (!super.setVelocityX) {
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
    private hurtPlant() {
        if (this.attackingPlant && this.attackingPlant.active) {
            this.attackingPlant.takeDamage(this.attackDamage, this);
            if (!this.attackingPlant) return;
            // console.log(`Zombie hurt plant, plant health: ${this.attackingPlant.health}`);
        }
    }

    // 销毁僵尸
    private destroyZombie() {
        // 通知正在收到攻击的植物
        this.attackingPlant?.attackingZombie.delete(this);

        if (this.attackTimer) {
            this.attackTimer.remove();
            this.attackTimer.destroy();
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
            this.scene.physics.world.remove(this.body);

            this.setOrigin(0.5, 1);
            this.zombieAnim.setOrigin(0.5, 1); // Sync origin with physics sprite

            this.scene.tweens.add({
                targets: [this, this.zombieAnim.body, this.zombieAnim.head,
                    this.zombieAnim.armLeft, this.zombieAnim.armRight,
                    this.zombieAnim.legLeft, this.zombieAnim.legRight],
                angle: 90,
                duration: 400,
                ease: 'Linear',
                onComplete: () => {
                    this.playDeathSmokeAnimation();
                    this.destroy();
                }
            });
        }
    }

    playDeathSmokeAnimation() {
        // 创建临时的白烟 sprite
        const smoke = this.scene.add.sprite(this.x, this.y, 'anime/death_smoke');
        smoke.setDisplaySize(this.displayWidth, this.displayWidth);
        smoke.setOrigin(0.5, 1);  // 设置底部为中心

        // 确保动画只创建一次（全局定义）
        if (!this.scene.anims.exists('death_smoke')) {
            this.scene.anims.create({
                key: 'death_smoke',
                frames: this.scene.anims.generateFrameNumbers('anime/death_smoke', { start: 0, end: 7 }),
                frameRate: 16,  // 0.5秒播放8帧
                repeat: 0
            });
        }
        // 播放动画并销毁
        smoke.play('death_smoke');
        smoke.once('animationcomplete', () => {
            smoke.destroy();    // 销毁临时白烟
        });
    }

    // 覆盖 destroy 方法，确保清理
    destroy(fromScene?: boolean) {
        this.attackTimer?.remove();
        this.attackTimer?.destroy();
        this.Spawner.registerDestroy(this);
        // 处理attach
        this.zombieAnim.destroy();
        this.attachSprites.forEach(sprite => sprite.destroy());
        super.destroy(fromScene);
    }

    // 每帧更新
    update() {
        // TODO: boss, elite 可能在x < 0时,不直接失败
        if (!this.isDying) {
            this.zombieAnim.updatePosition(this.x + this.offsetX, this.y + this.offsetY);
        }
        // 超越边界销毁
        if (this.x < 0) {
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