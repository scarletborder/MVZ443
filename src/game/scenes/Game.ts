import {
  PhaserEventBus,
  PhaserEvents,
} from '../EventBus';
import { Scene } from 'phaser';
import { PositionManager } from '../managers/view/PositionManager';
import CursorManager from '../managers/combat/CursorManager';
import PlantsManager from '../managers/combat/PlantsManager';
import { GameParams, GameSettings } from '../models/GameParams';
import CreateInnerMenu from '../utils/inner_menu';
import { StageData } from '../models/IRecord';
import BackendWS, { HasConnected } from '../../utils/net/sync';
import seedrandom from 'seedrandom';
import DepthUtils from '../../utils/depth';
import Musical from '../utils/musical';
import RAPIER from '@dimforge/rapier2d-deterministic-compat';
import CombatManager from '../managers/CombatManager';
import GridManager from '../managers/combat/GridManager';
import MobManager from '../managers/combat/MobManager';
import ObstacleManager from '../managers/combat/ObstacleManager';
import { BaseManager } from '../managers/BaseManager';
import CardpileManager from '../managers/combat/CardpileManager';
import KeybindManager from '../managers/combat/KeybindManager';
import ResourceManager from '../managers/combat/ResourceManager';
import SyncManager from '../managers/combat/SyncManager';
import TickerManager from '../managers/combat/TickerManager';
import DebugManager from '../managers/view/DebugManager';
import { BaseEntity } from '../models/core/BaseEntity';
import { DeferredManager } from '../managers/DeferredManager';
import StageHelper from '../utils/helper/StageHelper';
import { Request, RequestLoaded } from '../../pb/request';
import { PresetEventManager } from '../managers/combat/PresetEventManager';


export class Game extends Scene {
  private ManagerGroup: BaseManager[] = [];
  private scaleFactor: number = 1;

  public innerSettings: GameSettings;

  public rapierWorld: RAPIER.World;
  public rapierEventQueue: RAPIER.EventQueue;


  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  gameText: Phaser.GameObjects.Text;

  pauseBtn: Phaser.GameObjects.Text;
  waitText: Phaser.GameObjects.Text;
  speedText: Phaser.GameObjects.Text;

  params: GameParams;

  public stageData: StageData;

  musical: Musical;
  private readonly onCombatPauseHandler = () => {
    this.handlePause({ paused: true });
  };
  private readonly onCombatResumeHandler = () => {
    this.handlePause({ paused: false });
  };


  constructor() {
    console.log('Game constructor');
    super('Game');
  }

  preload() {
    BackendWS.FrameID = 0;
    this.params = this.game.registry.get('gameParams') as GameParams;
    this.stageData = this.cache.json.get(`ch${this.params.level}`) as StageData;
    this.innerSettings = this.params.gameSettings;

    this.ManagerGroup = [
      CombatManager.Instance,
      CardpileManager.Instance,
      CursorManager.Instance,
      DeferredManager.Instance,
      GridManager.Instance,
      KeybindManager.Instance,
      MobManager.Instance,
      ObstacleManager.Instance,
      PlantsManager.Instance,
      PresetEventManager.Instance,
      ResourceManager.Instance,
      SyncManager.Instance,
      TickerManager.Instance,
      DebugManager.Instance,
      PositionManager.Instance,
    ];
  }

  async create() {
    // read external data
    // TODO : 根据type具体判断放置那张背景图
    this.params = this.game.registry.get('gameParams') as GameParams;
    this.scaleFactor = this.scale.displaySize.width / 800;

    // 初始化各个Manager
    for (const manager of this.ManagerGroup) {
      manager.setScene(this);
      manager.Load();
    }

    PositionManager.Instance.setStageGrid(this.scaleFactor, this.stageData.rows);
    const gridProperties = new Array(PositionManager.Instance.Row_Number)
      .fill(0).map(() => new Array(PositionManager.Instance.Col_Number).fill('ground')); //  默认全为地板
    GridManager.Instance.setGridProperty(gridProperties);

    const randomPrng = seedrandom.alea(String(CombatManager.Instance.seed));
    const waves = StageHelper.generateStageScript(this.stageData.stageScript, randomPrng, this.params.level);
    MobManager.Instance.setWaves(waves);

    // 菜单
    CreateInnerMenu(this);

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
    ).setOrigin(0.5).setDepth(DepthUtils.getMenuDepth()).setVisible(false);

    // 初始化物理世界
    await RAPIER.init();
    this.rapierWorld = new RAPIER.World({ x: 0, y: 0 }); // 无重力的物理世界
    this.rapierEventQueue = new RAPIER.EventQueue(true);



    if (this.innerSettings.isDebug) {
      // 调试模式下可以添加可视化代码
      // TODO: 实现 RAPIER 的调试可视化
    }

    PhaserEventBus.on(PhaserEvents.RoomGameEnd, this.handleRoomGameEnd, this);
    CombatManager.Instance.Eventbus.on('onCombatPause', this.onCombatPauseHandler);
    CombatManager.Instance.Eventbus.on('onCombatResume', this.onCombatResumeHandler);

    this.musical = new Musical(this, this.params.gameSettings.isBgm, this.params.gameSettings.isSoundAudio);

    console.log('load finish');
    if (BackendWS.isRoomSessionMode()) {
      const request: RequestLoaded = { isLoaded: true };
      BackendWS.send(Request.toBinary({ payload: { loaded: request, oneofKind: 'loaded' } }));
    }
  }

  update(time: number, delta: number): void {
    CombatManager.Instance.update(time, delta);
  }

  changeScene() {
    this.scene.start('GameOver');
  }


  /**
   * 接收队列消费函数
  */


  broadCastFlag() {
    this.musical.unlimitAudio.play('wave1');
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
    ).setOrigin(0.5).setDepth(DepthUtils.getMenuDepth());

    // 4秒后更换文本内容为“来袭!!”
    this.time.addEvent({
      delay: 4000,
      callback: () => {
        this.musical.unlimitAudio.play('wave2');
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



  // 处理暂停
  private handlePause({ paused }: { paused: boolean }) {
    // 联机模式下不允许手动handle暂停
    if (BackendWS.isOnlineMode()) {
      return;
    }
    const pauseMenu = (this as any).pauseMenu;
    if (!pauseMenu) {
      return;
    }

    if (paused) {
      this.pauseGameScene();
      pauseMenu.show();
    } else {
      this.resumeGameScene();
      pauseMenu.hide();
    }
  }

  // 停止game scene
  private pauseGameScene() {
    this.anims?.pauseAll();
    this.tweens?.pauseAll();
    this.time.paused = true;
    this.musical?.pause();
  }

  // 恢复game scene
  private resumeGameScene() {
    this.anims?.resumeAll();
    this.tweens?.resumeAll();
    this.time.paused = false;
    this.musical?.resume();
  }

  // 游戏退出真实入口, 由消息队列调用
  private handleRoomGameEnd({ isWin = false }: { isWin?: boolean } = {}) {
    PhaserEventBus.off(PhaserEvents.RoomGameEnd, this.handleRoomGameEnd, this);
    CombatManager.Instance.Eventbus.off('onCombatPause', this.onCombatPauseHandler);
    CombatManager.Instance.Eventbus.off('onCombatResume', this.onCombatResumeHandler);

    this.musical?.destroy();

    // 销毁暂停菜单
    const pauseMenu = (this as any).pauseMenu;
    if (pauseMenu) {
      pauseMenu.destroy();
    }

    // 移除所有对game的监听，停止所有事件响应
    this.sound.stopAll();
    this.input.keyboard?.removeAllKeys(true, true);
    this.input.keyboard?.removeAllListeners();
    this.tweens.killAll();

    this.input.keyboard?.removeAllKeys(); // Clean up keyboard listeners
    this.input.off('pointerup'); // Remove pointer listeners
    this.input.off('pointermove');

    // TODO: Reset managers
    for (const manager of this.ManagerGroup) {
      manager.Reset();
    }

    this.scene.start('GameOver');
    this.params.gameExit({
      isWin,
      onWin: this.stageData.onWin,
      rewards: this.stageData.rewards,
      progress: isWin ? 100 : MobManager.Instance.progress,
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

  handleCollision(handle1: number, handle2: number) {
    // 1. 通过 handle 获取 Collider
    const colliderA = this.rapierWorld.getCollider(handle1);
    const colliderB = this.rapierWorld.getCollider(handle2);
    if (!colliderA || !colliderB) return;

    // 2. 获取 Collider 绑定的 RigidBody
    // 【修正】：collider.parent() 直接返回 RigidBody 对象本身
    const bodyA = colliderA.parent();
    const bodyB = colliderB.parent();
    if (!bodyA || !bodyB) return;

    // 3. 拿到你绑定的实体数据 BaseEntity
    const entityA = bodyA.userData as BaseEntity;
    const entityB = bodyB.userData as BaseEntity;
    if (!entityA || !entityB) return;
    //  将碰撞事件广播给两个实体
    entityA.onCollision({
      sourceEntity: entityA,
      targetEntity: entityB,
      sourceCollider: colliderA,
      targetCollider: colliderB,
    });
    entityB.onCollision({
      sourceEntity: entityB,
      targetEntity: entityA,
      sourceCollider: colliderB,
      targetCollider: colliderA,
    });
  }
}
