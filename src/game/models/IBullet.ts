import { Game } from "../scenes/Game";

export class IBullet extends Phaser.Physics.Arcade.Sprite {
    // 为每个preset子弹设置group
    public static Group: Phaser.Physics.Arcade.Group;

    // 私有属性
    public damage: number;
    public col: number;
    public row: number;

    static InitGroup(scene: Game) {
        this.Group = scene.physics.add.group({
            classType: IBullet,
            runChildUpdate: true,
        });
    }

    constructor(scene: Game, col: number, row: number, texture: string, damage: number = 5) {
        const { x, y } = scene.positionCalc.getBulletCenter(col, row);
        super(scene, x, y, texture);
        console.log(x,y)
        let size = scene.positionCalc.getBulletDisplaySize();
        this.setDisplaySize(size.sizeX, size.sizeY);
        size = scene.positionCalc.getBulletBodySize();
        this.setOrigin(0.5, 0.5);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        IBullet.Group.add(this, true);


        this.damage = damage;
    }
}
