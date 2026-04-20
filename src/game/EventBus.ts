import { Events } from 'phaser';

// Used to emit events between React components and Phaser scenes
// https://newdocs.phaser.io/docs/3.70.0/Phaser.Events.EventEmitter
export const PhaserEventBus = new Events.EventEmitter();

/**
 * 游戏事件常量命名空间
 * 
 * 使用示例：
 * - PhaserEventBus.emit(PhaserEvents.BossHealth, { health: 100 })
 * - PhaserEventBus.on(PhaserEvents.CardDeselected, handleCardDeselected)
 */
export namespace PhaserEvents {
  /**
   * 切换游戏暂停状态
   * @param 无参数
   * 触发时机：点击底部菜单的暂停按钮时触发
   * 说明：将通过CombatManager的事件onCombatPause和onCombatResume来控制游戏暂停和继续，确保状态同步
   */
  export const TogglePause = 'toggle-pause';

  /**
   * 切换游戏速度（1速/2速）
   * @param 无参数
   * 触发时机：点击右上角速度按钮或按下快捷键时触发
   * 说明：该事件仅作为“请求切换”的命令，由CombatManager处理具体变速逻辑
   */
  export const TimespeedToggle = 'timespeed-toggle';

  /**
   * 游戏速度已更新
   * @param { timeScale: number } - 当前GameScene的timeScale（仅 1 或 2）
   * 触发时机：CombatManager成功切换速度后触发
   */
  export const TimespeedChanged = 'timespeed-changed';

  /**
   * @deprecated 使用TogglePause代替
   * 设置游戏暂停状态
   * @param { paused: boolean } - true表示暂停，false表示继续
   * 触发时机：点击底部菜单的暂停按钮时触发
   */
  // export const SetIsPaused = 'setIsPaused';

  /**
   * @deprecated 将通过CombatManager的事件onCombatPause和onCombatResume来控制游戏暂停和继续
   * 游戏暂停状态已更新确认
   * @param { paused: boolean } - true表示已暂停，false表示已继续
   * 触发时机：Game场景处理暂停/继续后确认状态更新
   */
  // export const OkIsPaused = 'okIsPaused';

  /**
   * 场景已准备完毕
   * @param Game | GameOver - 返回场景对象
   * 触发时机：Game或GameOver场景的create方法完成时触发
   */
  export const CurrentSceneReady = 'current-scene-ready';

  /**
   * 游戏开始（本地或多人）
   * @param 无参数
   * 触发时机：单人游戏点击开始或多人房间所有玩家加载完毕时触发
   */
  export const RoomGameStart = 'room-game-start';

  /**
   * 游戏结束
   * @param { isWin: boolean } - true表示胜利，false表示失败
   * 触发时机：Boss被击败或所有波次怪物被清除时触发
   */
  export const RoomGameEnd = 'room-game-end';

  /**
   * @deprecated 使用MobManager的事件来替代
   * 游戏进度更新
   * @param { progress: number } - 进度百分比（0-100）
   * 触发时机：每当怪物被消灭、进度变化时触发
   */
  export const GameProgress = 'game-progress';

  /**
   * Boss血量更新
   * @param { health: number } - Boss血量百分比（0-100），-1表示Boss已死亡
   * 触发时机：Boss受伤或死亡时触发
   */
  export const BossHealth = 'boss-health';

  /**
   * Boss已死亡
   * @param 无参数
   * 触发时机：Boss被击败时触发
   */
  export const BossDead = 'boss-dead';

  /**
   * @deprecated 使用attempt和chosen系列的事件来替代
   * 卡片已取消选中
   * @param { pid: number | null } - 植物ID（取消选中时为null）
   * 触发时机：点击其他卡片或点击已选中卡片时触发
   */
  export const CardDeselected = 'card-deselected';

  /**
   * @deprecated 使用requestPlant事件替代，而且不应该需要监听他了。冷却和能量消耗由专门的事件处理
   * 植物已种植
   * @param { pid: number } - 植物ID
   * 触发时机：植物成功种植到游戏地图时触发
   */
  // export const MyCardHadPlant = 'card-plant';

  /**
   * @deprecated 这个事件只能由ResourceManager内部触发
   * 能量已更新
   * @param { energyChange: number } - 能量变化量（正数为增加，负数为减少）
   * 触发时机：种植植物消耗能量或获得能量时触发
   */
  // export const EnergyUpdate = 'energy-update';

  /**
   * @deprecated 由PlantManager触发该事件
   * 能量不足
   * @param 无参数
   * 触发时机：尝试种植植物但能量不足时触发
   */
  // export const EnergyInsufficient = 'energy-insufficient';

  /**
   * @deprecated 使用MobManager的事件来替代，新的碎片数量由ResourceManager直接管理
   * 星碎已获取
   * @param 无参数
   * 触发时机：击败携带星碎的僵尸时触发
   */
  // export const StarShardsGet = 'starshards-get';

  /**
   * @deprecated 使用ResourceManager的事件来替代更新后的能量
   * 星碎已消耗
   * @param 无参数
   * 触发时机：使用星碎能力时触发
   */
  // export const StarShardsConsume = 'starshards-consume';

  /**
   * @deprecated 直接执行CardpileManager的函数
   * 星碎被点击
   * @param 无参数
   * 触发时机：点击底部菜单的星碎按钮时触发
   */
  // export const StarShardsClick = 'starshards-click';

  /**
   * @deprecated 直接执行CardpileManager的函数
   * 镐子被点击
   * @param null
   * 触发时机：点击镐子工具或按下Q键时触发
   */
  // export const PickaxeClick = 'pickaxe-click';

  /**
   * @deprecated 使用cardpile的事件代替计数卡组冷却
   * 时间流已更新
   * @param { delta: number } - 帧间隔时间（毫秒）
   * 触发时机：每个游戏帧处理时触发，用于同步游戏时间
   */
  // export const TimeFlowSet = 'timeFlow-set';

  /**
   * 成功加入大厅
   * @param { roomId: number, myId: number, key: string, message: string }
   *   - roomId: 房间号
   *   - myId: 当前玩家ID
   *   - key: 房间密钥（空字符串表示公开房间）
   *   - message: 提示消息
   * 触发时机：成功连接到在线房间时触发
   */
  export const LobbyJoinSuccess = 'lobby-join-success';

  /**
   * 房间信息已更新
   * @param {
   *   roomId: number, 房间ID
   *   myId: number, 当前玩家ID
   *   lordId: number, 房主ID
   *   peers: string, 对端信息JSON字符串
   *   peersData: PeerInfo[], 解析后的对端玩家数据数组
   *   playerCount: number, 玩家总数
   * }
   * 触发时机：房间信息变化时触发
   */
  export const RoomInfo = 'room-info';

  /**
   * 房间已选择地图
   * @param chooseMap - 地图选择信息对象
   * 触发时机：房间主持人选择游戏地图时触发
   */
  export const RoomChooseMap = 'room-choose-map';

  /**
   * 房间已退出地图选择
   * @param 无参数
   * 触发时机：从选择地图界面返回大厅时触发
   */
  export const RoomQuitChooseMap = 'room-quit-choose-map';

  /**
   * 房间就绪计数已更新
   * @param { readyCount: number, totalPlayers: number }
   *   - readyCount: 已准备就绪的玩家数
   *   - totalPlayers: 房间总玩家数
   * 触发时机：玩家点击准备按钮时触发
   */
  export const RoomUpdateReadyCount = 'room-update-ready-count';

  /**
   * 房间所有玩家已就绪
   * @param { allPlayerCount: number, seed: number, myId: number, playerIds: number[] }
   * 触发时机：房间内所有玩家都点击准备按钮时触发
   */
  export const RoomAllReady = 'room-all-ready';

  /**
   * 房间已关闭
   * @param { message: string } - 关闭原因或消息
   * 触发时机：房间因人数不足或其他原因被关闭时触发
   */
  export const RoomClosed = 'room-closed';

  /**
   * 房间发生错误
   * @param { message: string } - 错误详情信息
   * 触发时机：房间连接或交互出错时触发
   */
  export const RoomError = 'room-error';
}
