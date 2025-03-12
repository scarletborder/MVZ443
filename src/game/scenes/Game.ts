import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { IPlant } from '../models/IPlant';
import { IZombie } from '../models/IZombie';
import { IBullet } from '../models/IBullet';
import { PositionCalc } from '../utils/position';
import Gardener from '../utils/gardener';
import MonsterSpawner from '../utils/spawner';
import InnerSettings from '../utils/settings';
import { GameParams, GameSettings } from '../models/GameParams';
import { PlantFactoryMap } from '../utils/loader';
import QueueReceive from '../utils/queue_receive';
import QueueSend from '../utils/queue_send';
import CreateInnerMenu from '../utils/inner_menu';
import { StageData } from '../models/IRecord';
import MineCart from '../presets/bullet/minecart';



export class Game extends Scene {
    private myID: number = 0;

    private scaleFactor: number = 1;
    private grid: Phaser.GameObjects.Rectangle[][];
    public GRID_ROWS = 4;
    public GRID_COLS = 9;

    public positionCalc: PositionCalc;
    public gardener: Gardener;
    public monsterSpawner: MonsterSpawner;
    public innerSettings: GameSettings;


    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;

    pauseBtn: Phaser.GameObjects.Text;
    pauseText: Phaser.GameObjects.Text;
    exitText: Phaser.GameObjects.Text;

    params: GameParams;
    private isDestroyed = false; // Track if the scene/game is destroyed
    public stageData: StageData;

    // command queue
    private elapsed: number = 0;
    sendQueue: QueueSend
    recvQueue: QueueReceive

    isGameEnd: boolean = true;


    constructor() {
        super('Game');
    }

    preload() {
        this.params = this.game.registry.get('gameParams') as GameParams;
        this.stageData = this.cache.json.get(`ch${this.params.level}`) as StageData;
        this.innerSettings = this.params.gameSettings;
    }

    create() {
        this.isGameEnd = true;
        // read external data
        // TODO : 根据type具体判断放置那张背景图
        this.params = this.game.registry.get('gameParams') as GameParams;
        this.scaleFactor = this.scale.displaySize.width / 800;

        this.GRID_ROWS = this.stageData.rows;
        this.positionCalc = new PositionCalc(this.scaleFactor, this.GRID_ROWS, this.GRID_COLS);
        this.monsterSpawner = new MonsterSpawner(this, this.stageData.waves);

        // 目前只有单机
        this.recvQueue = new QueueReceive({ mode: 'single' }, this);
        this.sendQueue = new QueueSend({ mode: 'single', recvQueue: this.recvQueue.queues });

        // 菜单
        CreateInnerMenu(this);

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

        if (this.innerSettings.isDebug) {
            this.physics.world.createDebugGraphic(); // 显示所有物体的碰撞体
        }
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

        const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        escKey?.on('down', () => {
            // 判断场景有无暂停
            const currently = this.physics.world.isPaused;
            this.handlePause({ paused: !currently });
        });

        EventBus.on('setIsPaused', this.handlePause, this);
        // TODO: move to gardener
        EventBus.on('starShards-chosen', () => { console.log('pick shards') });
        EventBus.on('game-fail', this.handleExit, this);

        this.sendQueue.sendReady();
    }

    update(time: number, delta: number): void {
        this.elapsed += delta;
        if (this.elapsed >= 100) {  // 达到 100 毫秒，执行函数
            this.recvQueue.Consume();
            this.elapsed -= 100; // 保留多余的时间，避免累积误差
        }
        this.sendQueue.Consume();
    }

    changeScene() {
        this.scene.start('GameOver');
    }


    /**
     * 接收队列消费函数
     */

    // 游戏开始
    handleGameStart(seed: number, myID: number) {
        this.monsterSpawner.setRandomSeed(seed);
        EventBus.emit('current-scene-ready', this);
        this.myID = myID;
        this.params.setInitialEnergy(this.stageData.energy);
        this.monsterSpawner.startWave();

        // 设置一排minecart
        for (let i = 0; i < this.GRID_ROWS; i++) {
            new MineCart(this, -1, i);
        }
        this.isGameEnd = false;
    }

    handleCardPlant(pid: number, level: number, col: number, row: number, uid: number) {
        // 关于判断能否种,本地已经判断,这里只判断冲突
        if (this.gardener.canPlant(col, row)) {
            // 根据 pid 创建具体植物,这里注册函数在preload时候放到game的loader里面
            // 本地种植
            const plantRecord = PlantFactoryMap[pid];
            if (plantRecord) {
                plantRecord.NewFunction(this, col, row, level);
            }
            // 成功种植,如果是自己
            if (this.myID === uid) {
                this.cancelPrePlant(); //现在可以取消预种植了
                // 可以进行冷却 
                this.broadCastPlant(pid);
            }
        }
    }

    handleRemovePlant(pid: number, col: number, row: number) {
        // 本地移除
        this.gardener.removePlant(pid, col, row);
    }


    /** 
     * 本地
    */

    // app->game 选择卡片，更新预种植植物
    chooseCard(pid: number, level: number) {
        this.gardener.setPrePlantPid(pid, level);
        EventBus.emit('card-deselected', { pid }); // 通知所有卡片取消选中
    }

    // app->game 取消预种植
    cancelPrePlant() {
        this.gardener.cancelPrePlant();
        EventBus.emit('card-deselected', { pid: null }); // 通知卡片取消选中
    }
    // game->app 通知种植卡片
    // 在react manager中处理消耗energy,处理冷却时间
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

    // game->app 通知游戏结束
    handleExit(isWin: boolean = false) {
        this.isGameEnd = true;
        EventBus.emit('okIsPaused', { paused: false });
        this.params.gameExit({
            isWin,
            onWin: this.stageData.onWin,
            rewards: this.stageData.rewards,
            progress: isWin ? 100 : this.monsterSpawner.progress,
        });
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
    const bullet = bulletSprite as IBullet;
    const zombie = zombieSprite as IZombie;

    bullet.CollideObject(zombie);
}


// 植物受到伤害的处理
function damagePlant(plantSprite: Phaser.GameObjects.GameObject, zombieSprite: Phaser.GameObjects.GameObject) {
    const plant = plantSprite as IPlant;
    const zombie = zombieSprite as IZombie;
    // console.log('size', plant.body?.width, plant.body?.height)
    zombie.startAttacking(plant);
}
