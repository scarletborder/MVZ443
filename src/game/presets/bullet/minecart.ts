import { SECKILL } from "../../../../public/constants";
import { IBullet } from "../../models/IBullet";
import IGolem from "../../models/IGolem";
import { IPlant } from "../../models/IPlant";
import { IZombie } from "../../models/IZombie";
import { Game } from "../../scenes/Game";
import IObstacle from "../obstacle/IObstacle";



export default class MineCart extends IBullet {
    screenWidth: number;
    screenFactor: number = 1;


    constructor(scene: Game, col: number, row: number) {
        super(scene, col, row, 'bullet/minecart', SECKILL, 'zombie');
        this.screenWidth = scene.sys.canvas.width;
        this.screenFactor = scene.positionCalc.scaleFactor;

        this.setDisplaySize(64 * this.screenFactor, 64 * this.screenFactor);

        this.setVelocityX(0); // 一定要在add    之后设置速度

    }

    CollideObject(object: IZombie | IPlant | IObstacle | IGolem): void {
        if (this.hasPenetrated.has(object)) {
            return;
        }
        this.hasPenetrated.add(object);
        const damage = SECKILL;
        // 矿车移动直到屏幕外边
        if (object instanceof IZombie || object instanceof IObstacle || object instanceof IGolem) {
            object.takeDamage(damage, 'bullet');
            // 如果没有速度,则设置速度
            if (this.body?.velocity.x === undefined || this.body?.velocity.x < 1) {
                this.setVelocityX(200 * this.screenFactor);
            }
        }
    }

    update(...args: any[]): void {
        // 超越边界销毁
        if (this.x > this.screenWidth * 1.2) {
            console.log('minecart out of screen');
            this.destroy();
        }
    }
}
