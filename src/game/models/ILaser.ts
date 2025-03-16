// 激光

import DepthManager from "../../utils/depth";
import { Game } from "../scenes/Game";
import { IPlant } from "./IPlant";
import { IZombie } from "./IZombie";


export class ILaser extends Phaser.GameObjects.Rectangle {
    public ScreenWidth: number = 1024;
    public ScreenHeight: number = 768;

    // 为每个preset laser设置group
    public static Group: Phaser.Physics.Arcade.Group;
    public targetCamp: 'plant' | 'zombie' = 'zombie'; // 默认打击僵尸

    // 私有属性
    public damage: number;
    public isFlying: boolean = false; // 是否在空中可以打击空中目标
    public hasPenetrated: Set<Phaser.Physics.Arcade.Sprite> = new Set(); // 已经穿透的目标

    // 视觉
    public col: number;
    public row: number;
    public baseDepth: number;

    static InitGroup(scene: Game) {
        this.Group = scene.physics.add.group({
            classType: ILaser,
            runChildUpdate: true,
        });
    }

    constructor(scene: Game, x1: number, y1: number, x2: number, y2: number,
        damage: number = 5, target: 'plant' | 'zombie' = 'zombie', duration: number = 400) {
        // 计算欧几里得距离作为激光的长边
        const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        // 计算激光中心位置（取起点和终点的平均）
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        // 计算激光的旋转角度，使激光沿 (x1,y1)->(x2,y2) 的方向
        const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);

        // 调用父类构造函数：宽度设为欧几里得距离，高度设为 gridSizeY，初始 alpha 为 0（全透明）
        super(scene, centerX, centerY, distance, scene.positionCalc.GRID_SIZEY * 0.6, 0xffffff, 0.2);
        this.setRotation(angle); // 设置激光旋转到正确角度

        this.ScreenWidth = scene.sys.canvas.width;
        this.ScreenHeight = scene.sys.canvas.height;

        this.targetCamp = target;
        this.damage = damage;

        scene.physics.add.existing(this);
        scene.add.existing(this);
        ILaser.Group.add(this, true);

        // Tween 动画：400ms 内将 alpha 从 0 渐变到 0.5，动画结束后销毁激光对象
        scene.tweens.add({
            targets: this,
            alpha: 0.7,
            duration: 400,
            onComplete: () => {
                this.destroy();
            }
        });
    }

    CollideObject(object: IZombie | IPlant) {
        const damage = this.damage;
        if (this.hasPenetrated.has(object)) return; // 已经穿透过了

        if (object instanceof IZombie && this.targetCamp === 'zombie') {
            // 如果激光的实际位置不再天上打不到isFlying
            if (object.isFlying && !this.isFlying) return;

            // 如果isInVoid,也打不到
            if (object.isInVoid) return;


            // 可以打
            // 穿透次数和销毁
            this.hasPenetrated.add(object);// 记录穿透过的对象

            object.takeDamage(damage, "laser");
        } else if (object instanceof IPlant && this.targetCamp === 'plant') {
            this.hasPenetrated.add(object); // 记录穿透过的对象

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

/**
 * 横线激光
 */
export function NewLaserByPos(scene: Game, x: number, y: number,
    distance: number = 5, damage: number = 5, target: 'plant' | 'zombie' = 'plant'): ILaser {
    const newY = y - scene.positionCalc.GRID_SIZEY * 0.7;
    const x2 = x + distance * scene.positionCalc.GRID_SIZEX;
    const y2 = newY;
    return new ILaser(scene, x, newY, x2, y2, damage, target);
}

/**
 * 横线激光
 */
export function NewLaserByGrid(scene: Game, col: number, row: number,
    distance: number = 10, damage: number = 10, target: 'plant' | 'zombie' = 'zombie', duration = 400): ILaser {
    const { x, y } = scene.positionCalc.getBulletCenter(col, row);
    const x2 = x + distance * scene.positionCalc.GRID_SIZEX;
    const y2 = y;
    const laser = new ILaser(scene, x, y, x2, y2, damage, target, duration);


    laser.baseDepth = DepthManager.getProjectileDepth('laser', row);
    laser.setDepth(laser.baseDepth);
    return laser;
}