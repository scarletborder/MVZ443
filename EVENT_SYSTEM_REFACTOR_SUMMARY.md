# Phaser事件系统重构总结

## 概述
本次重构将所有Phaser事件总线（PhaserEventBus）中的硬编码事件字符串转换为类型安全的常量，提高代码可维护性和IDE支持。

## 更新内容

### 1. EventBus.ts 文件更新
[src/game/EventBus.ts](src/game/EventBus.ts) 现在导出 25 个事件常量，分为以下几类：

#### 游戏控制事件
- `EVENT_SetIsPaused` - 设置游戏暂停状态
- `EVENT_OkIsPaused` - 确认暂停状态更新

#### 游戏生命周期事件
- `EVENT_CurrentSceneReady` - 场景已准备完毕
- `EVENT_RoomGameStart` - 游戏开始
- `EVENT_RoomGameEnd` - 游戏结束

#### 游戏进度事件
- `EVENT_GameProgress` - 游戏进度更新
- `EVENT_BossHealth` - Boss血量更新
- `EVENT_BossDead` - Boss已死亡

#### 卡片/植物事件
- `EVENT_CardDeselected` - 卡片已取消选中
- `EVENT_CardPlant` - 植物已种植

#### 能量和资源事件
- `EVENT_EnergyUpdate` - 能量已更新
- `EVENT_EnergyInsufficient` - 能量不足
- `EVENT_StarShardsGet` - 星碎已获取
- `EVENT_StarShardsConsume` - 星碎已消耗
- `EVENT_StarShardsClick` - 星碎被点击

#### UI交互事件
- `EVENT_PickaxeClick` - 镐子被点击
- `EVENT_TimeFlowSet` - 时间流已更新

#### 房间/在线事件
- `EVENT_LobbyJoinSuccess` - 成功加入大厅
- `EVENT_RoomInfo` - 房间信息已更新
- `EVENT_RoomChooseMap` - 房间已选择地图
- `EVENT_RoomQuitChooseMap` - 房间已退出地图选择
- `EVENT_RoomUpdateReadyCount` - 房间就绪计数已更新
- `EVENT_RoomAllReady` - 房间所有玩家已就绪
- `EVENT_RoomClosed` - 房间已关闭
- `EVENT_RoomError` - 房间发生错误

每个常量都包含详细的JSDoc注释，说明：
- 参数列表及其含义
- 事件触发时机
- 参数类型

### 2. 更新的文件清单

#### 游戏场景和管理器
- `src/game/scenes/Game.ts` - 主游戏场景
- `src/game/scenes/GameOver.ts` - 游戏结束场景
- `src/game/scenes/Preloader.ts` - 资源预加载场景
- `src/game/PhaserGame.tsx` - Phaser游戏组件
- `src/game/managers/combat/MobManager.ts` - 怪物管理器
- `src/game/sync/queue_receive.ts` - 接收队列
- `src/game/presets/golem/warden.ts` - Boss怪物预设
- `src/game/presets/golem/golem_obsidian.ts` - 黑曜石高勒姆
- `src/game/presets/plant/chapter1/magic_powder.ts` - 魔法粉植物
- `src/game/models/monster/IZombie.ts` - 僵尸模型
- `src/game/utils/spawner.ts` - 怪物刷怪器

#### React组件
- `src/components/widget/bottom.tsx` - 底部工具栏
- `src/components/widget/card.tsx` - 卡片组件
- `src/components/widget/vcard.tsx` - 垂直卡片组件
- `src/components/widget/pickaxe.tsx` - 镐子工具
- `src/components/widget/CircularProgress.tsx` - 圆形进度条
- `src/components/widget/OnlineStatus.tsx` - 在线状态显示
- `src/components/widget/EnergyDisplay.tsx` - 能量显示
- `src/components/GlobalRoomListener.tsx` - 全局房间监听器
- `src/components/GlobalOnlineStateListener.tsx` - 全局在线状态监听器
- `src/components/DocFrame.tsx` - 文档框架
- `src/components/menu/level/ParamsSelector.tsx` - 参数选择器

#### 网络和同步
- `src/utils/net/handlers.ts` - WebSocket消息处理器
- `src/utils/net/room.ts` - 房间请求发送器

### 3. 使用示例

**旧方式（已废弃）**：
```typescript
PhaserEventBus.emit('card-deselected', { pid: null });
PhaserEventBus.on('boss-health', handleBossHealth);
```

**新方式（推荐）**：
```typescript
import { PhaserEventBus, EVENT_CardDeselected, EVENT_BossHealth } from '../game/EventBus';

PhaserEventBus.emit(EVENT_CardDeselected, { pid: null });
PhaserEventBus.on(EVENT_BossHealth, handleBossHealth);
```

### 4. 优势

1. **类型安全** - 使用常量而非字符串，避免拼写错误
2. **IDE支持** - 完整的代码补全和错误检查
3. **可维护性** - 事件定义集中在一个文件，易于查看和修改
4. **文档完善** - 每个事件都有详细的JSDoc注释
5. **重构安全** - 修改事件名称时，IDE可以自动更新所有引用

## 迁移指南

如果您有其他文件需要使用这些事件常量，请按照以下步骤操作：

1. 在文件顶部导入所需的事件常量：
```typescript
import { PhaserEventBus, EVENT_YourEventName } from '../game/EventBus';
```

2. 将硬编码的字符串替换为常量：
```typescript
// 旧代码
PhaserEventBus.emit('your-event-name', data);

// 新代码
PhaserEventBus.emit(EVENT_YourEventName, data);
```

## 验证

所有更新已通过以下检查验证：
- ✅ 所有硬编码事件字符串已替换为常量
- ✅ 所有事件常量都已正确导出
- ✅ 所有导入语句都已正确添加
- ✅ 没有遗漏的事件字符串
