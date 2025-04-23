import { _TypeArrowEnhancement } from "../../../constants/game";
import { IBullet } from "../../models/IBullet";
import { Game } from "../../scenes/Game";
import BounceableBullet from "./bounceable";



export class Arrow extends BounceableBullet {
    originalX: number;
    maxDistance: number = 100;


    constructor(scene: Game, col: number, row: number, texture: string,
        damage: number, maxDistance: number, target: 'plant' | 'zombie') {
        super(scene, col, row, texture, damage, target);
        this.maxDistance = maxDistance;

        const size = scene.positionCalc.getBulletDisplaySize();
        size.sizeX *= 2;
        size.sizeY /= 2;
        this.setDisplaySize(size.sizeX, size.sizeY);
        this.setVelocityX(+300 * scene.positionCalc.scaleFactor); // 一定要在add    之后设置速度

        this.originalX = this.x;

        this.addVisible();
    }

    update(...args: any[]): void {
        super.update();
        if ((this.x - this.originalX) > this.maxDistance) {
            this.destroy();
        }
    }
}


function NewArrow(scene: Game, col: number, row: number,
    maxDistance?: number, damage: number = 15, target: 'plant' | 'zombie' = 'zombie'): IBullet {
    if (!maxDistance) {
        maxDistance = scene.positionCalc.GRID_SIZEX * 32;
    }

    const arrow = new Arrow(scene, col, row, 'bullet/arrow', damage, maxDistance, target);
    return arrow;
}

export default NewArrow;


/**
 * MutantYAxisArrow
 * 当 当前row超过 设定值的时候,取消y速度, 只向前移动
 */
class MutantYAxisArrow extends Arrow {
    targetRow: number;
    private targetY: number;
    /**
     * 方向，true表示向上超越某个row(即row小于targetRow)，false表示向下
     */
    lowerOrUpper: boolean;

    constructor(scene: Game, col: number, row: number, texture: string,
        damage: number, maxDistance: number, target: 'plant' | 'zombie',
        targetRow: number = row, yspeed: number) {
        super(scene, col, row, texture, damage, maxDistance, target);

        // 判断目标row和当前row的关系
        this.targetRow = targetRow;
        const { y } = scene.positionCalc.getBulletCenter(col, targetRow);
        this.targetY = y;
        this.lowerOrUpper = targetRow < row;

        if (this.lowerOrUpper && this.setVelocityY) {
            this.setVelocityY(-yspeed); // 向上
        }
        else if (this.setVelocityY) {
            this.setVelocityY(+yspeed); // 向下
        }
    }

    update(...args: any[]): void {
        super.update();

        if (!this || !this.setVelocityY || this.penetrate === 0) {
            return;  // Ensure `this` is not undefined and `setVelocityY` is available
        }

        try {
            // 如果当前row超过了设定值,取消y速度, 只向前移动
            if (this.lowerOrUpper) {
                if (this.y < this.targetY) {
                    this.setVelocityY(0); // 取消y速度
                    this.setY(this.targetY); // 设置到目标位置
                }
            }
            else {
                if (this.y > this.targetY) {
                    this.setVelocityY(0); // 取消y速度
                    this.setY(this.targetY); // 设置到目标位置
                }
            }
        } catch {
            if (this && this.destroy && this.scene) this.destroy();
        }
    }
}


export function NewMutantYAxisArrow(scene: Game, col: number, row: number,
    maxDistance?: number, damage: number = 15, target: 'plant' | 'zombie' = 'zombie',
    targetRow: number = row, yspeed: number = 200): IBullet {
    if (!maxDistance) {
        maxDistance = scene.positionCalc.GRID_SIZEX * 32;
    }

    const arrow = new MutantYAxisArrow(scene, col, row, 'bullet/arrow', damage, maxDistance, target, targetRow,
        yspeed * scene.positionCalc.scaleFactor);
    return arrow;
}