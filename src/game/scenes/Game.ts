import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { IPlant } from '../models/IPlant';
import { IZombie } from '../models/IZombie';
import { IBullet } from '../models/IBullet';
import NewPeaShooter from '../presets/plant/pea_shooter';
import NewZombie from '../presets/zombie/zombie';
import { PositionCalc } from '../utils/position';



export class Game extends Scene {
    private scaleFactor: number = 1;
    private gridOffsetX: number = 0;
    private gridOffsetY: number = 0;
    private grid: Phaser.GameObjects.Rectangle[][];
    private GRID_ROWS = 5;
    private GRID_COLS = 9;
    private GRID_SIZEX = 80;
    private GRID_SIZEY = 90;

    positionCalc: PositionCalc;
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;


    constructor() {
        super('Game');
    }

    preload() {
        // 设置资源路径
        this.load.setPath('assets');
        this.load.image('background', 'background.png'); // 请确保有背景资源
        this.load.image('bullet/pea', 'bullet/pea.png');
        this.load.image('plant/peashooter', 'plant/pea_shooter.png');
        this.load.image('zombie/zombie', 'zombie/zombie.png');
    }

    create() {
        this.scaleFactor = this.scale.displaySize.width / 800;
        this.positionCalc = new PositionCalc(this.scaleFactor);


        // 网格初始化
        this.grid = [];
        for (let row = 0; row < this.GRID_ROWS; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.GRID_COLS; col++) {
                const { x, y } = this.positionCalc.getGridTopLeft(col, row);
                const rect = this.add.rectangle(x, y, this.positionCalc.GRID_SIZEX,
                    this.positionCalc.GRID_SIZEY, 0x00ff00, 0.2).setOrigin(0, 0);
                rect.setStrokeStyle(1, 0xffffff);
                this.grid[row][col] = rect;
            }
        }

        this.physics.world.createDebugGraphic(); // 显示所有物体的碰撞体
        this.physics.world.drawDebug = true;
        this.physics.resume(); // 恢复物理系统

        // 设置主摄像机背景颜色
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x00ff00);

        // 添加背景并将其拉伸到整个场景
        this.background = this.add.image(0, 0, 'background').setOrigin(0, 0);
        this.background.setDisplaySize(this.scale.width, this.scale.height);
        this.background.setAlpha(0.5);

        // 创建分组
        IPlant.InitGroup(this);
        IZombie.InitGroup(this);
        IBullet.InitGroup(this);


        // 设置豌豆与僵尸的碰撞检测
        this.physics.add.overlap(IBullet.Group, IZombie.Group, damageZombie, null, this);
        // 设置植物与僵尸的碰撞检测
        this.physics.add.overlap(IPlant.Group, IZombie.Group, damagePlant, null, this);


        // 放置豌豆射手（植物），建议大小 80×80
        let peashooter = NewPeaShooter(this, 2, 1);

        // 创建僵尸（建议大小 80×120），这里放置 3 个僵尸
        for (let i = 0; i < 3; i++) {
            let zombie = NewZombie(this, 8, i);
        }


        EventBus.emit('current-scene-ready', this);
    }

    changeScene() {
        this.scene.start('GameOver');
    }

    // update(time: number, delta: number): void {
    //     IZombie.Group.getChildren().forEach(zombieObj => {
    //         const zombie = zombieObj as IZombie;
    //         const touchingPlant = this.physics.overlap(zombie, IPlant.Group);

    //         if (!touchingPlant && zombie.attackingPlant) {
    //             console.log('Zombie lost target');
    //             zombie.stopAttacking();
    //         }

    //         zombie.update(); // 调用僵尸的 update 方法
    //     });
    // }
}

// 豌豆与僵尸碰撞的伤害判定
function damageZombie(peaSprite: Phaser.GameObjects.GameObject, zombieSprite: Phaser.GameObjects.GameObject) {
    console.log('damage!'); // 确保碰撞被检测到
    const pea = peaSprite as IBullet;
    const zombie = zombieSprite as IZombie;

    pea.destroy();
    zombie.health -= pea.damage;
    if (zombie.health <= 0) {
        zombie.destroy();
    }
}


// 植物受到伤害的处理
function damagePlant(plantSprite: Phaser.GameObjects.GameObject, zombieSprite: Phaser.GameObjects.GameObject) {
    const plant = plantSprite as IPlant;
    const zombie = zombieSprite as IZombie;
    zombie.startAttacking(plant);
}
