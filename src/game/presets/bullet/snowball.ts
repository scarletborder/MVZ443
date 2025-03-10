import { IBullet } from "../../models/IBullet";
import { Game } from "../../scenes/Game";


class SnowBall extends IBullet {
    originalX: number;
    maxDistance: number = 100;

    constructor(scene: Game, col: number, row: number, texture: string) {
        super(scene, col, row, texture);
        this.damage = 15;
        this.originalX = this.x;
        this.setVelocityX(400); // 一定要在add    之后设置速度
    }

    update(...args: any[]): void {
        super.update();
        if ((this.x - this.originalX) > this.maxDistance) {
            this.destroy();
        }
    }
}

function NewSnowBullet(scene: Game, col: number, row: number, maxDistance : number): IBullet {
    const snowball = new SnowBall(scene, col, row, 'bullet/snowball');
    snowball.maxDistance = maxDistance;


    return snowball;
}

export default NewSnowBullet;