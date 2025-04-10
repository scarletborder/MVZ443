// 平射烟花火箭

import { IBullet } from "../../models/IBullet";
import { IExpolsion } from "../../models/IExplosion";
import { Game } from "../../scenes/Game";



export class HFireWork extends IBullet {
    scene: Game;
    originalX: number;
    maxDistance: number = 100;
    explodeDamage: number = 0; // 爆炸伤害

    constructor(scene: Game, col: number, row: number,
        damage: number, maxDistance: number, target: 'plant' | 'zombie', explodeDamage: number = 0) {
        const texture = 'bullet/Hfirework';
        super(scene, col, row, texture, damage, target);
        this.scene = scene;
        this.maxDistance = maxDistance;
        this.explodeDamage = explodeDamage;

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

    destroy(fromScene?: boolean): void {
        // 发生爆炸
        const game = this.scene;
        if (!game) return;
        new IExpolsion(game, this.x, this.row, {
            damage: this.explodeDamage,
            rightGrid: 0.5,
            leftGrid: 0.25,
            upGrid: 0,
        })

        super.destroy(fromScene);
    }
}


function NewHorizontalFireWork(scene: Game, col: number, row: number,
    maxDistance?: number, damage: number = 15, target: 'plant' | 'zombie' = 'zombie', explodeDamage = 0): IBullet {
    if (!maxDistance) {
        maxDistance = scene.positionCalc.GRID_SIZEX * 32;
    }

    const arrow = new HFireWork(scene, col, row, damage, maxDistance, target, explodeDamage);
    return arrow;
}

export default NewHorizontalFireWork;

