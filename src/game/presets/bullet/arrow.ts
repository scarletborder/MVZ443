import { IBullet } from "../../models/IBullet";
import { Game } from "../../scenes/Game";

function NewArrow(scene: Game, col: number, row: number): IBullet {
    const arrow = new IBullet(scene, col, row, 'bullet/arrow');
    let size = scene.positionCalc.getBulletDisplaySize();
    size.sizeX *= 2;
    size.sizeY /= 2;
    arrow.damage = 20;
    arrow.setDisplaySize(size.sizeX, size.sizeY);

    arrow.setVelocityX(200 * scene.positionCalc.scaleFactor); // 一定要在add    之后设置速度
    return arrow;
}

export default NewArrow;