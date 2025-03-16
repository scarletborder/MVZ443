import { IBullet } from "../../models/IBullet";
import { Game } from "../../scenes/Game";



class Arrow extends IBullet {
    originalX: number;
    maxDistance: number = 100;

    constructor(scene: Game, col: number, row: number, texture: string,
        damage: number, maxDistance: number, target: 'plant' | 'zombie') {
        super(scene, col, row, texture, damage, target);
        this.maxDistance = maxDistance;

        let size = scene.positionCalc.getBulletDisplaySize();
        size.sizeX *= 2;
        size.sizeY /= 2;
        this.setDisplaySize(size.sizeX, size.sizeY);
        this.setVelocityX(+300 * scene.positionCalc.scaleFactor); // 一定要在add    之后设置速度

        this.originalX = this.x;
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