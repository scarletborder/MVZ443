import { IBullet } from "../../models/IBullet";
import { Game } from "../../scenes/Game";


export class SnowBall extends IBullet {
    originalX: number;
    maxDistance: number;
    game: Game;

    constructor(scene: Game, col: number, row: number, texture: string,
        damage: number, maxDistance: number, target: 'plant' | 'zombie' = 'zombie') {
        super(scene, col, row, texture, damage, target);
        this.game = scene;
        this.maxDistance = maxDistance;

        this.originalX = this.x;
        this.setVelocityX(400 * scene.positionCalc.scaleFactor); // 一定要在add    之后设置速度
        this.addVisible();

        // 音效
        scene.musical.shootArrowPool.play();
    }

    update(...args: any[]): void {
        super.update();
        if ((this.x - this.originalX) > this.maxDistance) {
            this.destroy();
        }
    }
}

function NewSnowBullet(scene: Game, col: number, row: number,
    maxDistance?: number, damage: number = 15, target: 'plant' | 'zombie' = 'zombie'): IBullet {
    if (!maxDistance) {
        maxDistance = scene.positionCalc.GRID_SIZEX * 32;
    }
    const snowball = new SnowBall(scene, col, row, 'bullet/snowball', damage, maxDistance, target);
    return snowball;
}

export default NewSnowBullet;