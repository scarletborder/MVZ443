import { IBullet } from "../../models/IBullet";
import { Game } from "../../scenes/Game";

function NewPeaBullet(scene: Game, col: number, row: number): IBullet {
    const pea = new IBullet(scene, col, row, 'bullet/pea');
    pea.damage = 5;

    pea.setVelocityX(40); // 一定要在add    之后设置速度
    return pea;
}

export default NewPeaBullet;