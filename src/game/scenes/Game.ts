import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { IPlant } from '../models/IPlant';
import { IBullet } from '../models/IBullet';
import { PositionCalc } from '../utils/position';
import Gardener from '../utils/gardener';
import MonsterSpawner from '../utils/spawner';
import { GameParams, GameSettings } from '../models/GameParams';
import PlantFactoryMap from '../presets/plant';
import QueueReceive from '../sync/queue_receive';
import QueueSend from '../sync/queue_send';
import CreateInnerMenu from '../utils/inner_menu';
import { StageData } from '../models/IRecord';
import MineCart from '../presets/bullet/minecart';
import AddMapFunction from '../game_events/mapfun';
import BackendWS, { HasConnected } from '../../utils/net/sync';
import { IExpolsion } from '../models/IExplosion';
import { ILaser } from '../models/ILaser';
import IObstacle from '../presets/obstacle/IObstacle';
import { generateStageScript } from '../game_events/stage_script';
import seedrandom from 'seedrandom';
import DepthManager from '../../utils/depth';
import { IMonster } from '../models/monster/IMonster';
import { FrameTick } from '../../../public/constants';
import FrameTicker from '../sync/ticker';
import Musical from '../utils/musical';



export class Game extends Scene {
    private myID: number = 0;

    private scaleFactor: number = 1;
    private grid: Phaser.GameObjects.Sprite[][];
    public GRID_ROWS = 4;
    public GRID_COLS = 9;

    public positionCalc: PositionCalc;
    public gardener: Gardener;
    public monsterSpawner: MonsterSpawner;
    public innerSettings: GameSettings;
    public frameTicker: FrameTicker;

    /**
     * gridProperty[row][col]
     */
    public gridProperty: ("ground" | "water" | "sky")[][];

    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;

    pauseBtn: Phaser.GameObjects.Text;
    pauseText: Phaser.GameObjects.Text;
    exitText: Phaser.GameObjects.Text;
    waitText: Phaser.GameObjects.Text;
    speedText: Phaser.GameObjects.Text;

    params: GameParams;
    public seed: number = 0;
    private isDestroyed = false; // Track if the scene/game is destroyed
    public stageData: StageData;
    public dayOrNight: boolean = true; // day = true
    // 定期波数的额外游戏设置,如切换地图,进行额外非常规设置,在spawner中消费
    public extraFunc: Map<number, (game: Game, waveIdx: number) => void> = new Map<number, (game: Game) => void>();

    musical: Musical;

    // command queue
    private frameTick: number = 0; // 服务器帧
    private elapsed500: number = 0;

    sendQueue: QueueSend
    recvQueue: QueueReceive

    isPaused = true; // 是否暂停
    isGameEnd: boolean = true;


    constructor() {
        super('Game');
    }

    preload() {
        BackendWS.FrameID = 0;
        this.params = this.game.registry.get('gameParams') as GameParams;
        this.stageData = this.cache.json.get(`ch${this.params.level}`) as StageData;
        this.innerSettings = this.params.gameSettings;
    }

    create() {
        this.isGameEnd = true;
        this.frameTicker = new FrameTicker();
        // read external data
        // TODO : 根据type具体判断放置那张背景图
        this.params = this.game.registry.get('gameParams') as GameParams;
        this.scaleFactor = this.scale.displaySize.width / 800;

        this.GRID_ROWS = this.stageData.rows;
        this.gridProperty = new Array(this.GRID_ROWS).fill(0).map(() => new Array(this.GRID_COLS).fill('ground')); //  默认全为地板
        this.positionCalc = new PositionCalc(this.scaleFactor, this.GRID_ROWS, this.GRID_COLS);
        const randomPrng = seedrandom.alea(String(this.seed * 17));
        const waves = generateStageScript(this.stageData.stageScript, randomPrng, this.params.level);
        this.monsterSpawner = new MonsterSpawner(this, waves);

        // 目前只有单机
        // 判断是否联机
        if (!BackendWS.isConnected) {
            this.recvQueue = new QueueReceive({ mode: 'single' }, this);
            this.sendQueue = new QueueSend({ mode: 'single', recvQueue: this.recvQueue.queues });
        } else {
            this.recvQueue = new QueueReceive({ mode: 'multi' }, this);
            this.sendQueue = new QueueSend({ mode: 'single', recvQueue: this.recvQueue.queues }); // 断线后单人可玩
            // this.sendQueue = new QueueSend({ mode: 'multi' });
            BackendWS.setQueue(this.recvQueue, this.sendQueue);
        }

        // 菜单
        CreateInnerMenu(this);

        if (this.innerSettings.isDebug) {
            // 网格初始化
            this.physics.world.createDebugGraphic(); // 显示所有物体的碰撞体
        }
        this.physics.resume(); // 恢复物理系统

        // 设置主摄像机背景颜色
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor('rgba(0,0,0,0)');

        // 添加背景
        this.background = this.add.image(0, 0, 'bgimg');
        // 拉伸裁剪后的图片以填充整个场景宽度，保持高度比例
        this.background.setOrigin(0, 0).setDepth(2).setDisplaySize(this.scale.width, this.scale.height);

        // 调整摄像机位置，确保从 (0, 0) 开始显示
        this.cameras.main.scrollX = 0;
        this.cameras.main.scrollY = 0;


        // 创建一个waiting text
        this.waitText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            '等待中...',
            {
                fontSize: this.scale.displaySize.width / 20,
                color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                padding: { x: 10, y: 5 },
            }
        ).setOrigin(0.5).setDepth(DepthManager.getMenuDepth()).setVisible(false);

        // 禁用物理更新,使用frame的更新
        this.physics.disableUpdate();
        // 创建分组
        IPlant.InitGroup(this);
        IMonster.InitGroup(this);
        IBullet.InitGroup(this);
        IExpolsion.InitGroup(this);
        ILaser.InitGroup(this);
        IObstacle.InitGroup(this);


        // 设置bullet与僵尸的碰撞检测
        // @ts-ignore 
        this.physics.add.overlap(IBullet.Group, IMonster.Group, damageZombie, null, this);
        // @ts-ignore
        this.physics.add.overlap(IBullet.Group, IPlant.Group, damagePlantByBullet, null, this);
        // 设置plant与僵尸的碰撞检测
        // @ts-ignore
        this.physics.add.overlap(IPlant.Group, IMonster.Group, damagePlantByZombie, null, this);
        // 设置爆炸与僵尸的碰撞检测
        // @ts-ignore
        this.physics.add.overlap(IExpolsion.Group, IMonster.Group, explodeZombie, null, this);
        // 设置激光与僵尸的碰撞检测
        // @ts-ignore
        this.physics.add.overlap(ILaser.Group, IMonster.Group, laserZombie, null, this);
        // 设置激光与植物的碰撞检测
        // @ts-ignore
        this.physics.add.overlap(ILaser.Group, IPlant.Group, laserZombie, null, this);


        // obstacle
        // @ts-ignore 
        this.physics.add.overlap(IBullet.Group, IObstacle.Group, damageZombie, null, this);
        // @ts-ignore
        this.physics.add.overlap(IExpolsion.Group, IObstacle.Group, explodeZombie, null, this);
        // @ts-ignore
        this.physics.add.overlap(ILaser.Group, IObstacle.Group, laserZombie, null, this);




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
            const currently = this.isPaused;
            this.handlePause({ paused: !currently });
        });

        EventBus.on('setIsPaused', this.handlePause, this);
        EventBus.on('game-fail', this.handleExit, this);

        this.musical = new Musical(this, this.params.gameSettings.isBgm);
        this.sendQueue.sendReady();
    }

    update(time: number, delta: number): void {
        this.frameTick += delta; // 服务器帧
        this.elapsed500 += delta;
        const realFrameTick = FrameTick / this.time.timeScale; // 真实的帧间隔 
        if (this.frameTick >= realFrameTick) {  // 达到 100 毫秒，执行函数
            this.recvQueue.Consume();
            this.frameTick -= realFrameTick; // 保留多余的时间，避免累积误差
        }
        if (this.elapsed500 >= 500) {  // 达到 500 毫秒，执行函数
            // 更新怪物排序
            this.monsterSpawner.sortMonsters();
            this.elapsed500 -= 500; // 保留多余的时间，避免累积误差
        }

        // 每次更新直接消费 发送队列
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
        this.seed = seed;
        this.musical.playCurrent();
        this.monsterSpawner.setRandomSeed(seed);
        EventBus.emit('current-scene-ready', this);
        this.myID = myID;
        this.sendQueue.setMyID(myID);
        this.params.setInitialEnergy(this.stageData.energy);
        AddMapFunction(this);

        EventBus.emit('boss-dead');
        EventBus.emit('game-progress', { progress: 0 });
        // 销毁waitText
        this.waitText.destroy();

        // 设置一排minecart
        for (let i = 0; i < this.GRID_ROWS; i++) {
            new MineCart(this, -1, i);
        }
        this.isGameEnd = false;
    }

    // 和时间敏感事件的游戏开始
    handleGameFrameStart() {
        this.frameTicker.initStart();
        this.monsterSpawner.startWave();
        this.isPaused = false;
        EventBus.emit('okIsPaused', { paused: false });
    }

    handleCardPlant(pid: number, level: number, col: number, row: number, uid: number) {
        // 关于判断能否种,本地已经判断,这里只判断冲突
        if (this.gardener.canPlant(pid, col, row)) {
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

    handleStarShards(pid: number, col: number, row: number, uid: number) {
        const success = this.gardener.launchStarShards(pid, col, row);

        if (success && this.myID === uid) {
            EventBus.emit('starshards-consume');
        }
    }

    broadCastFlag() {
        // 创建新的广播文本
        const zombieText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height * 0.3,
            '一大波怪物即将登场',
            {
                fontSize: this.scale.displaySize.width / 20,
                color: 'rgb(187, 21, 21)', // 红色文本
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                padding: { x: 10, y: 5 },
            }
        ).setOrigin(0.5).setDepth(DepthManager.getMenuDepth());

        // 4秒后更换文本内容为“来袭!!”
        this.time.addEvent({
            delay: 4000,
            callback: () => {
                zombieText.setText('来袭!!');
                // 3秒后销毁文本对象
                this.time.addEvent({
                    delay: 3000,
                    callback: () => {
                        zombieText.destroy();
                    }
                });
            }
        });
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
        if (HasConnected() && energyChange > 0) energyChange = Math.ceil(0.5 * energyChange); // 联机模式下获取能量减半 
        EventBus.emit('energy-update', { energyChange });
    }
    // game->app 通知游戏进度
    broadCastProgress(progress: number) {
        EventBus.emit('game-progress', { progress });
    }

    // 处理暂停
    handlePause({ paused }: { paused: boolean }) {
        // 联机模式下不允许手动handle暂停
        if (BackendWS.isConnected) return;

        if (this.isDestroyed) return; // Skip if scene is destroyed
        if (!this.exitText || !this.pauseText) {
            console.warn('Text objects not initialized yet');
            return;
        }

        if (paused) {
            this.doHalt();
            this.pauseText.setVisible(true);
            this.exitText.setVisible(true);
        } else {
            this.recvQueue.queues.push({
                type: 0x03,
                FrameID: BackendWS.FrameID + 1,
            })
            this.doResume();
            this.pauseText.setVisible(false);
            this.exitText.setVisible(false);
        }
    }

    doHalt() {
        if (this.isDestroyed) return; // Skip if scene is destroyed
        this.physics.world.pause(); // 暂停物理系统
        this.anims?.pauseAll();
        this.tweens?.pauseAll();
        this.time.paused = true;
        try { this.exitText.setInteractive(); } finally { EventBus.emit('okIsPaused', { paused: true }); }
        this.isPaused = true;
        this.musical.pause();
    }

    doResume() {
        if (this.isDestroyed) return; // Skip if scene is destroyed
        this.physics.world.resume(); // 恢复物理系统
        this.anims?.resumeAll();
        this.tweens?.resumeAll();
        this.time.paused = false;
        try { this.exitText.disableInteractive(); } finally { EventBus.emit('okIsPaused', { paused: false }); }
        this.isPaused = false;
        this.musical.resume();
    }

    // game->app 通知游戏结束
    handleExit(isWin: boolean = false) {
        // 向发送队列发送消息,准备退出游戏
        if (this.isGameEnd) return; // 如果游戏已经结束，则不执行任何操作
        this.sendQueue.sendGameEnd(isWin ? 1 : 0); // 发送游戏结束消息
    }

    // 游戏退出真实入口, 由消息队列调用
    ExitEntry(isWin: boolean = false) {
        this.musical.destroy();
        // 移除所有game的事件监听
        this.sound.stopAll();
        this.input.keyboard?.removeAllKeys(true, true);
        this.input.keyboard?.removeAllListeners();
        this.tweens.killAll();

        this.isGameEnd = true;
        EventBus.emit('okIsPaused', { paused: false });
        this.params.gameExit({
            isWin,
            onWin: this.stageData.onWin,
            rewards: this.stageData.rewards,
            progress: isWin ? 100 : this.monsterSpawner.progress,
        });
    }

    // game->app 通知游戏的速率变化
    handleSpeedUp() {
        // 多人游戏无效
        if (HasConnected()) return;
        const newTimeFlow = this.time.timeScale === 1 ? 2 : 1; // 切换速率
        this.time.timeScale = newTimeFlow; // 设置新的游戏速率
        // Deprecated: 现在物理由frame驱动,精准地控制了时间
        // const newPhysicsTimeFlow = this.physics.world.timeScale === 1 ? 0.5 : 1; // 切换物理速率
        // this.physics.world.timeScale = newPhysicsTimeFlow; // 设置新的物理速率
        this.speedText.setText(newTimeFlow + '速');
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
    const zombie = zombieSprite as IMonster | IObstacle;

    bullet.CollideObject(zombie);
}

// bullet与植物碰撞的伤害判定
function damagePlantByBullet(bulletSprite: Phaser.GameObjects.GameObject, plantSprite: Phaser.GameObjects.GameObject) {
    const bullet = bulletSprite as IBullet;
    const plant = plantSprite as IPlant;
    bullet.CollideObject(plant);
}

// 植物受到怪物碰撞的处理
function damagePlantByZombie(plantSprite: Phaser.GameObjects.GameObject, zombieSprite: Phaser.GameObjects.GameObject) {
    const plant = plantSprite as IPlant;
    const zombie = zombieSprite as IMonster;
    // console.log('size', plant.body?.width, plant.body?.height)

    zombie.startAttacking(plant);
}

// 爆炸碰撞怪物
function explodeZombie(explosionSprite: Phaser.GameObjects.GameObject, zombieSprite: Phaser.GameObjects.GameObject) {
    const explosion = explosionSprite as IExpolsion;
    const zombie = zombieSprite as IMonster | IObstacle;
    explosion.CollideObject(zombie);
}

// 激光碰撞怪物
function laserZombie(laserSprite: Phaser.GameObjects.GameObject, zombieSprite: Phaser.GameObjects.GameObject) {
    const laser = laserSprite as ILaser;
    const zombie = zombieSprite as IMonster | IObstacle | IPlant;
    laser.CollideObject(zombie);
}