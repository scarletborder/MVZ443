import { SECKILL } from "../../../public/constants";
import DepthManager from "../../utils/depth";
import { Game } from "../scenes/Game";
import GolemAnim, { GolemAnimProps } from "../sprite/golem";
import GridClan from "../utils/grid_clan";
import MonsterSpawner from "../utils/spawner";

function setDisplay(spr: IGolem, scene: Game) {
    let size = scene.positionCalc.getZombieBodySize();
    spr.setBodySize(size.sizeX, size.sizeY * 0.9);
    size = scene.positionCalc.getZombieDisplaySize();
    spr.setDisplaySize(size.sizeX, size.sizeY);
    spr.setOffset(10 * scene.positionCalc.scaleFactor, + 20 * scene.positionCalc.scaleFactor);
    spr.setOrigin(0.5, 1);
}

export default class IGolem extends Phaser.Physics.Arcade.Sprite {
    public static Group: Phaser.Physics.Arcade.Group;
    static GridClan: GridClan;

    // 全局
    protected Spawner: MonsterSpawner;
    public game: Game;
    waveID: number;
    Rank: 'normal' | 'elite' | 'boss' = 'normal'; // 等级

    anim: GolemAnim;
    baseDepth: number;

    // 属性
    maxHealth: number = 300;
    health: number = 300;
    originalSpeed: number;
    speed: number;

    col: number;
    row: number;

    isDying: boolean = false;

    static InitGroup(scene: Game) {
        IGolem.Group = scene.physics.add.group({
            classType: IGolem,
            runChildUpdate: true,
        });
    }

    constructor(scene: Game, col: number, row: number, waveID: number, animProps: GolemAnimProps) {
        IGolem.GridClan = scene.gardener.GridClan;
        const { x, y } = scene.positionCalc.getZombieBottomCenter(col, row);

        const placeholder = 'zombie/zombie';
        super(scene, x, y, placeholder, 0);

        this.game = scene;
        this.waveID = waveID;
        this.Spawner = scene.monsterSpawner;
        this.setVisible(false);


        this.anim = new GolemAnim(scene, x, y, animProps);
        this.baseDepth = DepthManager.getZombieBasicDepth(row);
        this.SetSpeedFirstly(10 * scene.positionCalc.scaleFactor);
        this.setDepth();

        scene.add.existing(this);
        scene.physics.add.existing(this);

        setDisplay(this, scene);

        this.col = col;
        this.row = row;

        IGolem.Group.add(this);
        this.Spawner = scene.monsterSpawner;
        this.Spawner.registerMonster(this);
    }

    public takeDamage(amount: number, projectileType?: "bullet" | "laser" | "explosion" | "trajectory"): void {
        console.log(amount)
        if (amount >= SECKILL / 2) {
            amount = 1000;
        }
        this.setHealth(this.health - amount);
    }

    // 设置生命值并监听
    public setHealth(value: number) {
        if (value < this.health) this.anim.highlight();
        this.health = value;
        if (this.health <= 0) {
            this.destoryZombie();
        }
    }

    destoryZombie() {
        // TODO: 删除一系列定时器
        this.playDeathAnimation();
    }

    playDeathAnimation(): void {
        this.isDying = true;
        this.setVelocityX(0);
        this.anim.stopArmSwing();
        this.anim.stopLegSwing();
        // 移除物理效果
        if (this.body) {
            this.body.enable = false;
            this.game.physics.world.remove(this.body);

            this.setOrigin(0.5, 1);
            this.anim.setOrigin(0.5, 1); // Sync origin with physics sprite

            this.game.tweens.add({
                targets: [this, this.anim.body, this.anim.head,
                    this.anim.armLeft, this.anim.armRight,
                    this.anim.legLeft, this.anim.legRight],
                angle: 90,
                duration: 800,
                ease: 'Linear',
                onComplete: () => {
                    this.destroy();
                }
            });
        }
    }

    public jumpTo(x2: number, y2: number, duration: number, _arcHeight: number): void {
        const arcHeight = _arcHeight * this.game.positionCalc.scaleFactor;

        // 当前起点
        const start = new Phaser.Math.Vector2(this.x, this.y);
        // 目标终点
        const end = new Phaser.Math.Vector2(x2, y2);
        // 为了形成一个上凸的弧线，这里让控制点位于起点和终点中点位置，并垂直上移 arcHeight
        const controlX = (this.x + x2) / 2;
        const controlY = Math.min(this.y, y2) - arcHeight;
        const controlPoint = new Phaser.Math.Vector2(controlX, controlY);

        // 创建二次贝塞尔曲线
        const curve = new Phaser.Curves.QuadraticBezier(start, controlPoint, end);

        // // 禁用物理效果，避免在跳跃过程中与其他对象发生碰撞
        // if (this.body) {
        //     this.body.enable = false;
        // }

        // 用于存储 Tween 进度和计算中间位置的对象
        const path = { t: 0, vec: new Phaser.Math.Vector2() };

        // 使用场景中的 Tween 来让 t 从 0 变化到 1，沿曲线更新位置
        this.game.tweens.add({
            targets: path,
            t: 1,
            duration: duration,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                // 根据当前 t 值获取曲线上对应的点
                curve.getPoint(path.t, path.vec);
                this.setPosition(path.vec.x, path.vec.y);
                // 同步更新动画位置
                if (this.anim && this.anim.updatePosition) {
                    this.anim.updatePosition(path.vec.x, path.vec.y);
                }
            },
            onComplete: () => {
                // 跳跃结束后的逻辑，可根据需要重新启用物理效果或触发其他操作
                // 例如：
                // if (this.body) {
                //     this.body.enable = true;
                // }
            }
        });
    }

    public digTo(x2: number, y2: number,): void {
        this.anim.highJump();
        this.game.time.delayedCall(1000, () => {
            this.anim.dig();
            this.x = x2;
            this.y = y2;
            this.game.time.delayedCall(2000, () => {
                this.anim.getOut();
            })
        })

    }







    destroy(fromScene?: boolean): void {
        this.Spawner.registerDestroy(this);
        this.anim.destroy();
        super.destroy(fromScene);
    }

    SetSpeedFirstly(speed: number) {
        this.originalSpeed = speed;
        this.speed = speed;
    }

    update() {
        if (!this.isDying && !this.anim.isInAnim) {
            this.anim.updatePosition(this.x, this.y);
            return;
        }
    }

    setDepth() {
        this.anim.setDepth(this.baseDepth);
        return this;
    }
}