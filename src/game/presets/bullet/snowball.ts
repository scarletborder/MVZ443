import { IBullet } from "../../models/IBullet";
import { Game } from "../../scenes/Game";

function NewSnowBullet(scene: Game, col: number, row: number): IBullet {
    const snowball = new IBullet(scene, col, row, 'bullet/snowball');
    snowball.damage = 15;

    snowball.setVelocityX(40); // 一定要在add    之后设置速度
    return snowball;
}

export default NewSnowBullet;