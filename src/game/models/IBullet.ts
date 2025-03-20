import DepthManager from "../../utils/depth";
import IObstacle from "../presets/obstacle/IObstacle";
import { Game } from "../scenes/Game";
import IGolem from "./IGolem";
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

        this.col = col;
        this.row = row;

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

    CollideObject(object: IZombie | IPlant | IGolem | IObstacle) {
        const damage = this.damage;
        if (this.hasPenetrated.has(object) || this.penetrate <= 0) return; // 已经穿透过了

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
            if (object.plant_height === 1) return;
            // 关于bullet击打植物,判断该格内的优先目标,shield>一般>carrier
            // 如果一grid内部的植物数量 > penetrate
            const col = object.col;
            const row = object.row;
            const key = `${col}-${row}`;
            // 既然有object,那么就肯定会有List
            // 如果有重要的植物,那么让他承担伤害
            const list = object.scene.gardener.planted.get(key);
            if (list) {
                this.hasPenetrated.add(object);// 记录穿透过的对象
                const clan = object.scene.gardener.GridClan;
                for (const plant of list) {
                    // 判断有没有更高级目标承担伤害
                    if (clan.MorePriorityPlant(object, plant)) object = plant;
                }
                object.takeDamage(damage);
            }

            // TODO: 僵尸子弹直接摧毁
            this.penetrate = 0;
            this.destroy();
        } else if (object instanceof IGolem && this.targetCamp === 'zombie') {
            this.penetrate--;
            this.hasPenetrated.add(object);// 记录穿透过的对象

            if (this.penetrate <= 0) {
                this.destroy();
            }
            object.takeDamage(damage, "bullet");
        } else if (object instanceof IObstacle && this.targetCamp === 'zombie') {
            this.penetrate--;
            this.hasPenetrated.add(object);// 记录穿透过的对象

            if (this.penetrate <= 0) {
                this.destroy();
            }
            object.takeDamage(damage, "bullet");
        }
    }

    update(...args: any[]): void {
        // 超越边界销毁
        if (this.x > this.ScreenWidth * 1.5 || this.x < -this.ScreenWidth * 0.5) {
            this.destroy();
        }
    }
}
