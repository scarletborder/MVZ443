import { IBullet } from "../../models/IBullet";
import { IPlant } from "../../models/IPlant";
import { Game } from "../../scenes/Game";
import NewPeaBullet from "../bullet/pea";

function NewPeaShooter(scene: Game, col: number, row: number): IPlant {
    const peashooter = new IPlant(scene, col, row, 'plant/peashooter');
    peashooter.health = 10;

    // 如果图片边界不完全匹配，可根据需要调整碰撞盒偏移

    peashooter.Timer = scene.time.addEvent({
        delay: 1000,  // 每隔1秒发射一次
        callback: () => {
            if (peashooter.health > 0) {
                shootPea(scene, peashooter);
            }
        },
        loop: true
    });

    return peashooter;
}

function shootPea(scene: Game, shooter: IPlant) {
    console.log(shooter.x, shooter.y)
    const pea = NewPeaBullet(scene, shooter.col, shooter.row);
    let size = scene.positionCalc.getBulletBodySize();
    pea.setBodySize(size.sizeX, size.sizeY);
    size = scene.positionCalc.getBulletDisplaySize();
    pea.setDisplaySize(size.sizeX, size.sizeY);

    pea.setVelocityX(200); // 一定要在add    之后设置速度
}

export default NewPeaShooter;