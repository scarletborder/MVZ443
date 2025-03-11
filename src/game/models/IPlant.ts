import DepthManager from "../../utils/depth";
import { Game } from "../scenes/Game";
import Gardener from "../utils/gardener";
import { IZombie } from "./IZombie";

export class IPlant extends Phaser.Physics.Arcade.Sprite {
    public static Group: Phaser.Physics.Arcade.Group;
    gardener: Gardener;

    public pid: number;
    public health: number;
    public level: number;
    public Timer?: Phaser.Time.TimerEvent;
    public attackingZombie: Set<IZombie> = new Set<IZombie>();

    public col: number;
    public row: number;

    public baseDepth: number;

    static InitGroup(scene: Game) {
        this.Group = scene.physics.add.group({
            classType: IPlant,
            runChildUpdate: true
        });
    }


    constructor(scene: Game, col: number, row: number, texture: string, pid: number, level: number) {
        // TODO: texture逻辑还是要的,通过New某个植物的时候,传入对应的texture
        const { x, y } = scene.positionCalc.getPlantBottomCenter(col, row);
        super(scene, x, y, texture, 0);


        this.pid = pid;
        this.level = level;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.debugShowBody = true
        if (!this.body) {
            throw new Error('IPlant body is null');
        }

        IPlant.Group.add(this, true);  //TODO: 一定要把group带入,否则,真的会忘记添加到组里面
        let size = scene.positionCalc.getPlantDisplaySize();
        this.setDisplaySize(size.sizeX, size.sizeY); // 改变显示大小 
        size = scene.positionCalc.getPlantBodySize();
        this.setBodySize(size.sizeX, size.sizeY);
        // console.log(scene.positionCalc.scaleFactor)
        // this.setScale(scene.positionCalc.scaleFactor);

        this.setOrigin(0.5, 1);

        // console.log(this.body.width, this.body.height);
        this.body.immovable = true;

        this.col = col;
        this.row = row;
        this.gardener = scene.gardener;
        this.gardener.registerPlant(this);

        this.baseDepth = DepthManager.getPlantBasicDepth(row);
        this.setDepth(this.baseDepth);
        console.log('Plant created', this.depth);
    }

    public setHealth(value: number) {
        this.health = value;
        console.log(`Plant health updated to: ${this.health}`);

        if (this.health <= 0) {
            this.destroyPlant();
        }
    }

    public takeDamage(amount: number, zombie: IZombie) {
        this.setHealth(this.health - amount);
    }

    // 星之碎片
    public onStarShards() {
        console.log('Plant onStarShards');
    }

    // 调用摧毁
    private destroyPlant() {
        // 通知正在攻击的僵尸
        this.attackingZombie.forEach(zombie => {
            zombie.stopAttacking();
        });
        // 停止物理效果（已在 destroy 中自动处理）
        this.destroy(true); // 移除植物
        console.log('Plant destroyed');
    }

    // 底层摧毁
    destroy(fromScene?: boolean) {
        if (this.Timer) {
            this.Timer.remove();
            this.Timer.destroy();
        }
        this.gardener.registerDestroy(this);
        super.destroy(fromScene);
    }

}