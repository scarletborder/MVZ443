// 激光

import DepthManager from "../../utils/depth";
import IObstacle from "../presets/obstacle/IObstacle";
import { Game } from "../scenes/Game";
import { IPlant } from "./IPlant";
import { IMonster } from "./monster/IMonster";

type _Typedebuffs = 'slow' | 'frozen' | null;

type LaserParams = {
    debuff?: _Typedebuffs,
    duration?: number,
    toSky?: boolean,
}

interface VisionParams {
    invisible: boolean;
    color: number;
    alphaFrom: number;
    alphaTo: number;
}

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

    // buff
    public debuff: _Typedebuffs = null;
    public duration: number = 0;

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
        damage: number = 5, target: 'plant' | 'zombie' = 'zombie', duration: number = 400,
        params?: LaserParams,
        visionParams: VisionParams = { invisible: false, color: 0xffffff, alphaFrom: 0.2, alphaTo: 0.5 }) {
        // 计算欧几里得距离作为激光的长边
        const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        // 计算激光中心位置（取起点和终点的平均）
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        // 计算激光的旋转角度，使激光沿 (x1,y1)->(x2,y2) 的方向
        const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);

        // 调用父类构造函数：宽度设为欧几里得距离，高度设为 gridSizeY，初始 alpha 为 0（全透明）
        super(scene, centerX, centerY, distance, scene.positionCalc.GRID_SIZEY * 0.6,
            visionParams.color, visionParams.alphaFrom);
        this.setRotation(angle); // 设置激光旋转到正确角度

        this.ScreenWidth = scene.sys.canvas.width;
        this.ScreenHeight = scene.sys.canvas.height;

        this.targetCamp = target;
        this.isFlying = params?.toSky || false;
        this.damage = damage;

        if (params) {
            this.debuff = params.debuff || null;
            this.duration = params.duration || 0;
        }

        scene.physics.add.existing(this);
        scene.add.existing(this);
        ILaser.Group.add(this, true);

        if (visionParams.invisible) {
            this.alpha = 0;
            scene.time.delayedCall(105, () => {
                this.destroy(); // 悄悄删除
            });
            return;
        }

        // Tween 动画：400ms 内将 alpha 从 0 渐变到 0.5，动画结束后销毁激光对象
        scene.tweens.add({
            targets: this,
            alpha: visionParams.alphaTo,
            duration: duration,
            onComplete: () => {
                this.destroy();
            }
        });
    }

    CollideObject(object: IMonster | IPlant | IObstacle) {
        const damage = this.damage;
        if (this.hasPenetrated.has(object)) return; // 已经穿透过了

        if (object instanceof IMonster && this.targetCamp === 'zombie') {
            // 如果激光的实际位置不再天上打不到isFlying
            if (object.getIsFlying() && !this.isFlying) return;

            // 如果isInVoid,并且该格子 没有 被照亮,也打不到
            // TODO: isInVoid的逻辑将在gardener中写,种植发光器械可以赋予周边的grid以 glow 状态
            if (object.isInVoid && (!false)) return;


            // 可以打
            // 穿透次数和销毁
            this.hasPenetrated.add(object);// 记录穿透过的对象

            object.takeDamage(damage, "laser");
            // 如果有debuff
            if (this.debuff) {
                object.catchDebuff(this.debuff, this.duration);
            }
        } else if (object instanceof IPlant && this.targetCamp === 'plant') {
            this.hasPenetrated.add(object); // 记录穿透过的对象

            object.takeDamage(damage);
        }
    }
}

/**
 * 横线激光
 */
export function NewLaserByPos(scene: Game, x: number, y: number,
    distance: number = 5, damage: number = 5, target: 'plant' | 'zombie' = 'plant',
    duration: number = 400, params?: LaserParams,
    visionParams: VisionParams = { invisible: false, color: 0xffFFff, alphaFrom: 0.2, alphaTo: 0.5 }): ILaser {
    const newY = y - scene.positionCalc.GRID_SIZEY * 0.7;
    const x2 = x + distance * scene.positionCalc.GRID_SIZEX;
    const y2 = newY;
    return new ILaser(scene, x, newY, x2, y2, damage, target, duration, params, visionParams);
}

/**
 * 横线激光
 */
export function NewLaserByGrid(scene: Game, col: number, row: number,
    distance: number = 12, damage: number = 10, target: 'plant' | 'zombie' = 'zombie',
    duration = 400, params?: LaserParams,
    visionParams: VisionParams = { invisible: false, color: 0xffFFff, alphaFrom: 0.2, alphaTo: 0.5 }): ILaser {
    const { x, y } = scene.positionCalc.getBulletCenter(col, row);
    const x2 = x + distance * scene.positionCalc.GRID_SIZEX;
    const y2 = y;
    const laser = new ILaser(scene, x, y, x2, y2, damage, target, duration, params, visionParams);


    laser.baseDepth = DepthManager.getProjectileDepth('laser', row);
    laser.setDepth(laser.baseDepth);
    return laser;
}