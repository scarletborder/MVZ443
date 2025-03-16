import DepthManager from "../../utils/depth";
import { Game } from "../scenes/Game";
import { IPlant } from "./IPlant";
import { IZombie } from "./IZombie";

export class IBullet extends Phaser.Physics.Arcade.Sprite {
    public ScreenWidth: number = 1024;
    public ScreenHeight: number = 768;

    // 为每个preset子弹设置group
    public static Group: Phaser.Physics.Arcade.Group;
    public targetCamp: 'plant' | 'zombie' = 'zombie'; // 默认打击僵尸

    // 私有属性
    public damage: number;
    public penetrate: number = 1; // 穿透次数
    public isFlying: boolean = false; // 是否在空中可以打击空中目标
    public hasPenetrated: Set<Phaser.Physics.Arcade.Sprite> = new Set(); // 已经穿透的目标

    // 视觉
    public col: number;
    public row: number;
    public baseDepth: number;

    static InitGroup(scene: Game) {
        this.Group = scene.physics.add.group({
            classType: IBullet,
            runChildUpdate: true,
        });
    }

    constructor(scene: Game, col: number, row: number, texture: string,
        damage: number = 5, target: 'plant' | 'zombie' = 'zombie') {
        const { x, y } = scene.positionCalc.getBulletCenter(col, row);
        super(scene, x, y, texture);

        this.ScreenWidth = scene.sys.canvas.width;
        this.ScreenHeight = scene.sys.canvas.height;

        this.targetCamp = target;
        this.damage = damage;

        scene.physics.add.existing(this);
        scene.add.existing(this);

        let size = scene.positionCalc.getBulletBodySize();
        size = scene.positionCalc.getBulletDisplaySize();
        this.setDisplaySize(size.sizeX, size.sizeY);

        this.setOrigin(0.5, 0.5);
        IBullet.Group.add(this, true);

        this.baseDepth = DepthManager.getProjectileDepth('bullet', col);
        this.setDepth(this.baseDepth);
    }

    CollideObject(object: IZombie | IPlant) {
        const damage = this.damage;
        if (this.hasPenetrated.has(object)) return; // 已经穿透过了

        if (object instanceof IZombie && this.targetCamp === 'zombie') {
            // 如果子弹的实际位置不再天上打不到isFlying
            if (object.isFlying && !this.isFlying) return;

            // 如果isInVoid,也打不到
            if (object.isInVoid) return;

            // 可以打
            // 穿透次数和销毁
            this.penetrate--;
            this.hasPenetrated.add(object);// 记录穿透过的对象
            if (this.penetrate <= 0) {
                this.destroy();
            }
            object.takeDamage(damage, "bullet");
        } else if (object instanceof IPlant && this.targetCamp === 'plant') {
            this.penetrate--;
            this.hasPenetrated.add(object);// 记录穿透过的对象

            if (this.penetrate <= 0) {
                this.destroy();
            }
            object.takeDamage(damage);
        }
    }

    update(...args: any[]): void {
        // 超越边界销毁
        if (this.x > this.ScreenWidth * 1.5 || this.x < -this.ScreenWidth * 0.5) {
            this.destroy();
        }
    }
}
