import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { IPlant } from '../models/IPlant';
import { IZombie } from '../models/IZombie';
import { IBullet } from '../models/IBullet';
import { PositionCalc } from '../utils/position';
import Gardener from '../utils/gardener';
import MonsterSpawner from '../utils/spawner';
import InnerSettings from '../utils/settings';
import { GameParams } from '../models/GameParams';
import { MAXDEPTH } from '../../../public/constants';
import DepthManager from '../../utils/depth';



export class Game extends Scene {
    private scaleFactor: number = 1;
    private grid: Phaser.GameObjects.Rectangle[][];
    public GRID_ROWS = 5;
    public GRID_COLS = 9;

    public positionCalc: PositionCalc;
    public gardener: Gardener;
    public monsterSpawner: MonsterSpawner;
    public innerSettings: InnerSettings;


    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;

    pauseBtn: Phaser.GameObjects.Text;
    pauseText: Phaser.GameObjects.Text;
    exitText: Phaser.GameObjects.Text;

    params: GameParams;
    private isDestroyed = false; // Track if the scene/game is destroyed


    constructor() {
        super('Game');
    }

    preload() {
        // 设置资源路径
        // this.load.setPath('assets');
        // // this.load.image('background', 'background.png'); // 请确保有背景资源
        // // TODO: 移动到preload中
        // this.load.image('bullet/snowball', 'bullet/snowball.png');
        // this.load.image('bullet/arrow', 'bullet/arrow.png');


        // this.load.image('plant/dispenser', 'plant/dispenser.png');
        // this.load.spritesheet('plant/furnace', 'plant/furnace.png',
        //     { frameWidth: 64, frameHeight: 64 });
        // this.load.spritesheet('plant/obsidian', 'plant/obsidian.png',
        //     { frameWidth: 64, frameHeight: 64 });


        // this.load.image('zombie/zombie', 'zombie/zombie.png');
        // this.load.image('attach/zombie_wound', 'attach/zombie_wound.png');
        // this.load.spritesheet('attach/cap', 'attach/cap.png',
        //     { frameWidth: 33, frameHeight: 14 });

        // this.load.spritesheet('anime/death_smoke', 'anime/death_smoke.png',
        //     { frameWidth: 16, frameHeight: 16 });

        // this.load.json('ch101', 'stages/ch101.json');
    }

    create() {
        this.params = this.game.registry.get('gameParams') as GameParams;
        this.scaleFactor = this.scale.displaySize.width / 800;
        this.positionCalc = new PositionCalc(this.scaleFactor);
        this.monsterSpawner = new MonsterSpawner(this, this.cache.json.get('ch101'));

        // 屏幕中央显示 "已停止" 的文本，默认隐藏
        this.pauseBtn = this.add.text(
            this.cameras.main.width,
            this.cameras.main.height,
            '暂停',
            {
                fontSize: this.scale.displaySize.width / 30,
                color: 'rgb(187, 21, 21)',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                padding: { x: 10, y: 5 },
            }
        ).setOrigin(1, 1).setInteractive().setDepth(DepthManager.getMenuDepth());
        this.pauseBtn.on('pointerup', () => {
            // 判断场景有无暂停
            let currently = this.physics.world.isPaused;
            this.handlePause({ paused: !currently });
        }, this);

        this.pauseText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 3,
            '已停止',
            {
                fontSize: this.scale.displaySize.width / 20,
                color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                padding: { x: 10, y: 5 },
            }
        ).setOrigin(0.5).setVisible(false).setDepth(DepthManager.getMenuDepth());

        this.exitText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height,
            '退出游戏',
            {
                fontSize: this.scale.displaySize.width / 20,
                color: 'rgb(187, 21, 21)',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                padding: { x: 10, y: 5 },
            }
        ).setOrigin(0.5, 1).setVisible(false).disableInteractive().setDepth(DepthManager.getMenuDepth());
        this.exitText.on('pointerup', this.handleExit, this);



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


        // 监听
        this.gardener = new Gardener(this, this.positionCalc);

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            this.gardener.onClickUp(pointer);
        }, this);
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            this.gardener.onMouseMoveEvent(pointer);
        }, this);

        var escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        escKey?.on('down', () => {
            // 判断场景有无暂停
            let currently = this.physics.world.isPaused;
            this.handlePause({ paused: !currently });
        });


        // // 创建僵尸（建议大小 80×120），这里放置 3 个僵尸
        // for (let i = 0; i < 3; i++) {
        //     let zombie = NewZombie.NewFunction(this, 9, i);
        // }

        this.innerSettings = new InnerSettings();

        EventBus.emit('current-scene-ready', this);
        EventBus.on('setIsPaused', this.handlePause, this);
        EventBus.on('starShards-chosen', () => { console.log('pick shards') });
        this.monsterSpawner.startWave();


    }

    update(time: number, delta: number): void { }

    changeScene() {
        this.scene.start('GameOver');
    }

    // app->game 选择卡片，更新预种植植物
    chooseCard(pid: number) {
        this.gardener.setPrePlantPid(pid);
        EventBus.emit('card-deselected', { pid }); // 通知所有卡片取消选中
    }

    // app->game 取消预种植
    cancelPrePlant() {
        this.gardener.cancelPrePlant();
        EventBus.emit('card-deselected', { pid: null }); // 通知卡片取消选中
    }
    // game->app 通知种植卡片
    // 在react manager中处理消耗energy
    broadCastPlant(pid: number) {
        EventBus.emit('card-plant', { pid });
    }
    // game->app 通知取消种植卡片
    broadCastCancelPrePlant() {
        EventBus.emit('card-deselected', { pid: null }); // 通知卡片取消选中
    }
    // game->app 通知更新能量
    broadCastEnergy(energyChange: number) {
        EventBus.emit('energy-update', { energyChange });
    }
    // game->app 通知游戏进度
    broadCastProgress(progress: number) {
        EventBus.emit('game-progress', { progress });
    }
    // game->app 通知游戏结束
    broadCastGameOver(win: boolean) {
        EventBus.emit('game-over', { win });
    }
    // 处理暂停
    handlePause({ paused }: { paused: boolean }) {
        if (this.isDestroyed) return; // Skip if scene is destroyed
        if (!this.exitText || !this.pauseText) {
            console.warn('Text objects not initialized yet');
            return;
        }

        if (paused) {
            this.physics.world?.pause();
            this.anims?.pauseAll();
            this.tweens?.pauseAll();
            this.time.paused = true;
            this.pauseText.setVisible(true);
            this.exitText.setVisible(true);
            try { this.exitText.setInteractive(); } finally { EventBus.emit('okIsPaused', { paused: true }); }
        } else {
            this.physics.world?.resume();
            this.anims?.resumeAll();
            this.tweens?.resumeAll();
            this.time.paused = false;
            this.pauseText.setVisible(false);
            this.exitText.setVisible(false);
            try { this.exitText.disableInteractive(); } finally { EventBus.emit('okIsPaused', { paused: false }); }
        }
    }
    handleExit() {
        // this.physics.world?.resume(); // 恢复物理系统
        // this.anims.resumeAll(); // 恢复所有动画
        // this.time.paused = false; // 恢复定时器
        // this.pauseText.setVisible(false); // 隐藏"已停止"文本
        // this.exitText.setVisible(false).disableInteractive();.
        this.params.gameExit();
        EventBus.emit('okIsPaused', { paused: false });
    }

    destroy() { // Override Phaser's destroy method
        this.isDestroyed = true;
        EventBus.off('setIsPaused', this.handlePause, this); // Clean up listener
        this.input.keyboard?.removeAllKeys(); // Clean up keyboard listeners
        this.input.off('pointerup'); // Remove pointer listeners
        this.input.off('pointermove');
    }
}

// bullet与僵尸碰撞的伤害判定
function damageZombie(bulletSprite: Phaser.GameObjects.GameObject, zombieSprite: Phaser.GameObjects.GameObject) {
    console.log('damage!'); // 确保碰撞被检测到
    const bullet = bulletSprite as IBullet;
    const zombie = zombieSprite as IZombie;

    bullet.destroy();
    zombie.takeDamage(bullet.damage);
}


// 植物受到伤害的处理
function damagePlant(plantSprite: Phaser.GameObjects.GameObject, zombieSprite: Phaser.GameObjects.GameObject) {
    const plant = plantSprite as IPlant;
    const zombie = zombieSprite as IZombie;
    // console.log('size', plant.body?.width, plant.body?.height)
    zombie.startAttacking(plant);
}
