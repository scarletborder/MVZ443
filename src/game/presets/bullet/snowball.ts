import { IBullet } from "../../models/IBullet";
import { Game } from "../../scenes/Game";


class SnowBall extends IBullet {
    originalX: number;
    maxDistance: number = 100;

    constructor(scene: Game, col: number, row: number, texture: string, damage: number, maxDistance: number) {
        super(scene, col, row, texture);
        this.damage = damage;
        this, maxDistance = maxDistance;

        this.originalX = this.x;
        this.setVelocityX(400 * scene.positionCalc.scaleFactor); // 一定要在add    之后设置速度
    }

    update(...args: any[]): void {
        super.update();
        if ((this.x - this.originalX) > this.maxDistance) {
            this.destroy();
        }
    }
}

function NewSnowBullet(scene: Game, col: number, row: number, maxDistance: number, damage?: number): IBullet {
    if (!damage) {
        damage = 15;
    }
    const snowball = new SnowBall(scene, col, row, 'bullet/snowball', damage, maxDistance);


    return snowball;
}

export default NewSnowBullet;