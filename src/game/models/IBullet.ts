import DepthManager from "../../utils/depth";
import { Game } from "../scenes/Game";
import { IPlant } from "./IPlant";
import { IZombie } from "./IZombie";

export class IBullet extends Phaser.Physics.Arcade.Sprite {
    public ScreenWidth: number = 1024;
    public ScreenHeight: number = 768;

    // 为每个preset子弹设置group
    public static Group: Phaser.Physics.Arcade.Group;

    // 私有属性
    public damage: number;
    public col: number;
    public row: number;

    public baseDepth: number;

    static InitGroup(scene: Game) {
        this.Group = scene.physics.add.group({
            classType: IBullet,
            runChildUpdate: true,
        });
    }

    constructor(scene: Game, col: number, row: number, texture: string, damage: number = 5) {
        const { x, y } = scene.positionCalc.getBulletCenter(col, row);
        super(scene, x, y, texture);

        this.ScreenWidth = scene.sys.canvas.width;
        this.ScreenHeight = scene.sys.canvas.height;

        scene.physics.add.existing(this);
        scene.add.existing(this);
        IBullet.Group.add(this, true);

        let size = scene.positionCalc.getBulletBodySize();
        size = scene.positionCalc.getBulletDisplaySize();
        this.setDisplaySize(size.sizeX, size.sizeY);

        this.setOrigin(0.5, 0.5);
        this.damage = damage;

        this.baseDepth = DepthManager.getProjectileDepth('bullet', col);
        this.setDepth(this.baseDepth);
    }

    CollideObject(object: IZombie | IPlant) {
        const damage = this.damage;

        if (object instanceof IZombie) {
            // 如果子弹的实际位置不再天上打不到isFlying
            if (object.isFlying) return;

            // 如果isInVoid,也打不到
            if (object.isInVoid) return;
            this.destroy(); // 一般子弹,碰到就销毁
            object.takeDamage(damage);
        } else if (object instanceof IPlant) {
            console.log('bullet hit plant, function not implemented');
            this.destroy(); // 一般子弹,碰到就销毁
        }
    }

    update(...args: any[]): void {
        // 超越边界销毁
        if (this.x > this.ScreenWidth * 1.2 || this.x < -this.ScreenWidth * 0.2) {
            this.destroy();
        }
    }
}
