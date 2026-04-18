# 植物系统新架构重构指南

## 概述

植物系统已重构为 **Model-Entity 分离架构**，清晰地将**游戏逻辑**与**场景表现**分离。

## 架构核心

### 两层结构

```
PlantModel (游戏逻辑层)
    ├── 属性定义 (maxHealth, cost, damage, cooldown 等)
    ├── 游戏事件回调 (onCreate, onStarShards, onSleepStateChange)
    └── 实体工厂方法 (createEntity)
         ↓
PlantEntity (场景实体层)
    ├── 视图构建 (buildView - 构建 Sprite)
    ├── 动画播放 (playXxxAnimation)
    └── 交互反馈
```

## 详解：Furnace（炉子）案例

### Model 层：FurnaceModel

**职责**：定义游戏逻辑、资源管理、计时器调度

```typescript
export class FurnaceModel extends PlantModel {
  // 1. 属性定义（随等级变化）
  generateEnergyCooldown = new PlantStat(25000).setDecValue(0.85);
  generateEnergyAmount = new PlantStat(25).setThreshold(9, 40);

  // 2. 游戏逻辑入口
  onCreate(entity: FurnaceEntity): void {
    const cooldownTime = this.generateEnergyCooldown.getValueAt(entity.level);
    
    // 3. 使用 tickmanager 精确管理游戏逻辑定时器
    entity.tickmanager.addEvent({
      startAt: cooldownTime * 0.7,
      delay: cooldownTime,
      repeat: -1,
      callback: () => {
        // 游戏状态检查
        if (entity.isSleeping) return;
        if (entity.currentHealth <= 0) return;
        
        // 4. 触发 Entity 的动画反馈
        entity.playGenerateAnimation();
        
        // 5. 通过 ResourceManager 更新全局资源
        const energyToAdd = this.generateEnergyAmount.getValueAt(entity.level);
        ResourceManager.Instance.UpdateEnergy(energyToAdd, 'all');
      }
    });
  }

  // 6. 星辰碎片特殊能力
  onStarShards(entity: FurnaceEntity): void {
    ResourceManager.Instance.UpdateEnergy(450, 'all');
  }
}
```

### Entity 层：FurnaceEntity

**职责**：管理视图、播放动画、响应游戏事件

```typescript
export class FurnaceEntity extends PlantEntity {
  protected buildView() {
    // 创建 Sprite，添加到 viewGroup
    const sprite = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(size.sizeX, size.sizeY);
    this.viewGroup.add(sprite);
  }

  public playGenerateAnimation() {
    const sprite = this.viewGroup.getChildren()[0] as Phaser.GameObjects.Sprite;
    
    // 立即切换帧（游戏逻辑已经在 Model 中处理）
    sprite.setFrame(1);

    // 使用 scene.time 处理动画时序
    this.scene.time.delayedCall(1000, () => {
      if (this.currentHealth > 0) {
        sprite.setFrame(0); // 恢复初始帧
      }
    });
  }
}
```

## 关键设计原则

### 1. 定时器的选择

| 场景 | 使用方案 | 理由 |
|------|--------|------|
| 能量生成周期（25000ms） | `tickmanager.addEvent()` | 游戏逻辑，需精确控制，支持暂停/恢复 |
| 动画延迟（1000ms） | `scene.time.delayedCall()` | 纯表现层，独立于游戏状态 |
| 周期性检查（每帧） | `tickmanager` | 游戏逻辑同步 |

**核心差异**：
- **tickmanager**：基于**帧数**，精确、可同步、支持保存/加载
- **scene.time**：基于**实际时间**，用于动画、音效等表现效果

### 2. 资源管理：ResourceManager

**事件驱动模式**

```typescript
// Model 中更新资源
ResourceManager.Instance.UpdateEnergy(energyToAdd, 'all');

// 其他系统可监听资源变化
ResourceManager.Instance.Eventbus.on('onEnergyUpdate', (newEnergy, playerId) => {
  // 更新 UI 显示等
});
```

**参数说明**：
- `energyDelta`: 能量变化量（支持负数）
- `playerId`: 目标玩家，支持 `'mine'`（当前玩家）、`'all'`（所有玩家）或具体 ID

### 3. 生命周期回调

Model 中的标准回调：

| 回调 | 触发时机 | 典型用途 |
|------|--------|--------|
| `onCreate()` | Entity 创建时 | 启动定时器、初始化逻辑 |
| `onStarShards()` | 星辰碎片触发时 | 特殊能力激活 |
| `onSleepStateChange()` | 睡眠状态改变时 | 暂停/恢复逻辑 |

### 4. Manager 事件系统

常用 Managers 及其事件：

```typescript
// ResourceManager - 资源变化
ResourceManager.Instance.Eventbus.on('onEnergyUpdate', (energy, playerId) => {});
ResourceManager.Instance.Eventbus.on('onStarShardsUpdate', (shards, playerId) => {});

// TickerManager - 游戏帧事件
TickerManager.Instance.onFrameUpdate.on((currentFrame) => {});

// MobManager - 怪物相关
MobManager.Instance.Eventbus.on('onMobDead', (mob) => {});
```

## 重构检查清单

重构其他植物时，确保：

- [ ] Model 类继承 `PlantModel`
- [ ] 定义所有属性（health, cost, damage 等）
- [ ] 在 `onCreate()` 中启动游戏逻辑定时器（用 `tickmanager`）
- [ ] 在 `onStarShards()` 中处理特殊能力
- [ ] Entity 类继承 `PlantEntity`
- [ ] 在 `buildView()` 中构建 Sprite
- [ ] 提供 `playXxxAnimation()` 方法用于动画反馈（用 `scene.time`）
- [ ] 导出 `const XxxData = new XxxModel()` 实例

## 对比：Furnace vs Dispenser vs Lily

| 特性 | Furnace（炉子） | Dispenser（喷枪） | Lily（睡莲） |
|------|----------------|------------------|------------|
| 主要逻辑 | 周期生成能量 | 周期发射箭矢 | 特殊能力生成副本 |
| 定时器类型 | 单个周期定时器 | 周期定时器 + 延迟调用 | 无（仅 onStarShards） |
| 特殊能力 | 一次性加能量 | 暴力发射（50连射） | 在周围种植分身 |
| 关键 Manager | ResourceManager | ProjectileCmd, CombatHelper | PlantsManager, GridManager |
| 动画数量 | 1个（生成动画） | 2个（普通射击、暴力射击） | 0个（简单显示） |
| 地形限制 | 无 | 无 | 仅可在水地形 |

### Lily 案例详解

**LilyModel** (游戏逻辑层)：

```typescript
export class LilyModel extends PlantModel {
  onStarShards(entity: LilyEntity): void {
    const scene = entity.scene as Game;

    // 在周围3x3的水地形上种植Lily
    for (let i = entity.col - 1; i <= entity.col + 1; i++) {
      for (let j = entity.row - 1; j <= entity.row + 1; j++) {
        // 1. 检查坐标合法性
        if (i < 0 || i >= PositionManager.Instance.Col_Number ||
            j < 0 || j >= PositionManager.Instance.Row_Number) {
          continue;
        }

        // 2. 跳过自己
        if (i === entity.col && j === entity.row) continue;

        // 3. 检查地形类型（仅在水地形种植）
        const gridProp = GridManager.Instance.GetGridProperty(i, j);
        if (!gridProp || gridProp.type !== 'water') {
          continue;
        }

        // 4. 检查该位置是否已有Lily（避免重复）
        const key = `${i}-${j}`;
        let hasLily = false;
        const plantList = PlantsManager.Instance.PlantsMap.get(key);
        if (plantList) {
          for (const plant of plantList) {
            if (plant.pid === this.pid) {
              hasLily = true;
              break;
            }
          }
        }

        // 5. 如果满足条件，创建新的Lily Entity
        if (!hasLily) {
          const newLily = this.createEntity(scene, i, j, entity.level);
          // Entity constructor 会自动注册到 PlantsManager
        }
      }
    }
  }
}
```

**关键模式**：
- **多重检查**：坐标合法 → 地形检查 → 重复检查 → 创建
- **自动注册**：PlantEntity constructor 会自动调用 PlantsManager.RegisterPlant()
- **Manager 查询**：使用 GridManager 和 PlantsManager 进行状态检查

## 示例：添加新的周期逻辑

```typescript
onCreate(entity: XxxEntity): void {
  // 1. 获取属性值（支持等级提升）
  const cooldownMs = this.someCooldown.getValueAt(entity.level);
  
  // 2. 启动游戏逻辑定时器
  entity.tickmanager.addEvent({
    startAt: cooldownMs * 0.5,      // 延迟50%后开始
    delay: cooldownMs,               // 循环间隔
    repeat: -1,                      // 无限重复
    callback: () => {
      // 3. 检查游戏状态
      if (entity.isSleeping) return;
      if (entity.currentHealth <= 0) return;
      
      // 4. 触发动画反馈
      entity.playMyAnimation();
      
      // 5. 执行游戏逻辑
      // 更新资源 / 生成投射物 / 造成伤害 等
    }
  });
}
```

## 性能建议

1. **避免在回调中创建大量对象** → 使用对象池
2. **使用 `isSleeping` 检查** → 暂停逻辑而不是销毁定时器
3. **合理使用 `repeat` 参数** → 一次性逻辑用 `repeat: 0`
4. **在 `onDestroy()` 中清理定时器** → 自动处理（框架层面）

## API 迁移指南

### PositionManager（位置计算管理）

**旧架构**中使用 `this.game.positionCalc`，**新架构**中统一使用 `PositionManager.Instance`。

#### 常见替换清单

| 旧 API | 新 API | 说明 |
|--------|--------|------|
| `this.game.positionCalc.Row_Number` | `PositionManager.Instance.Row_Number` | 行数 |
| `this.game.positionCalc.Col_Number` | `PositionManager.Instance.Col_Number` | 列数 |
| `this.game.positionCalc.GRID_SIZEX` | `PositionManager.Instance.GRID_SIZEX` | 网格宽度 |
| `this.game.positionCalc.GRID_SIZEY` | `PositionManager.Instance.GRID_SIZEY` | 网格高度 |

#### 完整 PositionManager API 列表

```typescript
// 单例获取
PositionManager.Instance

// 网格配置属性
.Row_Number: number                    // 行数
.Col_Number: number                    // 列数
.GRID_SIZEX: number                    // 网格宽度
.GRID_SIZEY: number                    // 网格高度

// 常用位置计算方法
.getGridTopLeft(col, row)               // 获取格子左上角坐标 {x, y}
.getGridCenter(col, row)                // 获取格子中心坐标 {x, y}
.getPlantBottomCenter(col, row)         // 获取植物底部中心 {x, y}
.getPlantDisplaySize()                  // 获取植物显示尺寸 {sizeX, sizeY}
.getPlantBodySize()                     // 获取植物碰撞体尺寸 {sizeX, sizeY}
.getBulletCenter(col, row)              // 获取子弹中心坐标 {x, y}
.getBulletDisplaySize()                 // 获取子弹显示尺寸 {sizeX, sizeY}
.getZombieBottomCenter(col, row)        // 获取僵尸底部中心 {x, y}
.getZombieDisplaySize()                 // 获取僵尸显示尺寸 {sizeX, sizeY}
```

#### 迁移示例

**旧代码（冰冻炸弹）**:
```typescript
const rangeWidth = this.game.positionCalc.GRID_SIZEX * 1.5;
for (let row = 0; row < this.game.positionCalc.Row_Number; row++) {
  // 逻辑
}
```

**新代码**:
```typescript
const rangeWidth = PositionManager.Instance.GRID_SIZEX * 1.5;
for (let row = 0; row < PositionManager.Instance.Row_Number; row++) {
  // 逻辑
}
```

### GridManager（地形网格管理）

**旧架构**中使用 `game.gridProperty[row][col]`，**新架构**中统一使用 `GridManager.Instance`。

#### 常见替换清单

| 旧 API | 新 API | 说明 |
|--------|--------|------|
| `game.gridProperty[row][col]` | `GridManager.Instance.GetGridProperty(col, row)?.type` | 获取格子类型 |
| 检查是否水地形 | `GridManager.Instance.GetGridProperty(col, row)?.type === 'water'` | 地形检查 |

#### 完整 GridManager API

```typescript
// 单例获取
GridManager.Instance

// 获取指定坐标的地形属性
.GetGridProperty(col: number, row: number): GridProperty | null
  // 返回 { type: 'ground' | 'water' | 'void' | 'sky' }

// 获取某行的属性占比
.RowPropertyRatio(row: number, property: 'ground' | 'water' | 'void'): number
```

#### 地形类型说明

| 类型 | 说明 |
|------|------|
| `ground` | 陆地，可种植所有植物 |
| `water` | 水面，仅可种植水生植物（如 Lily） |
| `void` | 虚空，不可种植 |
| `sky` | 天空，不可种植 |

#### 迁移示例

**旧代码（Lily）**:
```typescript
if (game.gridProperty[j][i] !== 'water') continue;
```

**新代码**:
```typescript
const gridProp = GridManager.Instance.GetGridProperty(i, j);
if (!gridProp || gridProp.type !== 'water') {
  continue;
}
```

### PlantsManager（植物管理）

**旧架构**中使用 `game.plantsManager`，**新架构**使用 `PlantsManager.Instance`。

#### 常见替换清单

| 旧 API | 新 API | 说明 |
|--------|--------|------|
| `game.plantsManager.planted.get(key)` | `PlantsManager.Instance.PlantsMap.get(key)` | 查询某位置的植物列表 |

#### 完整 PlantsManager API

```typescript
// 单例获取
PlantsManager.Instance

// 植物容器（自动管理，无需手动操作）
.PlantsMap: Map<string, PlantEntity[]>  // key: "${col}-${row}"

// 事件系统
.EventBus: EventBus<PlantsManagerEvent>
  .on('onDeterminePlant', (pid, level, col, row) => {})
  .on('onDetermineUseStarShards', (pid, col, row) => {})
  .on('onDetermineRemovePlant', (pid, col, row) => {})
  .on('onEnergyInsufficient', () => {})

// 植物查询
.PlantsMap.get("${col}-${row}"): PlantEntity[] | undefined
```

#### 迁移示例

**旧代码（Lily 检查是否已有 Lily）**:
```typescript
if (game?.plantsManager?.planted.has(key)) {
  const list = game?.plantsManager?.planted.get(key);
  if (list) {
    for (const plant of list) {
      if (plant.pid === Lily.pid) {
        couldPlant = false;
      }
    }
  }
}
```

**新代码**:
```typescript
const key = `${i}-${j}`;
let hasLily = false;
const plantList = PlantsManager.Instance.PlantsMap.get(key);
if (plantList) {
  for (const plant of plantList) {
    if (plant.pid === this.pid) {
      hasLily = true;
      break;
    }
  }
}
```

### TimerManager（定时器管理）

**旧架构**使用 `scene.frameTicker`，**新架构**分为两种：
- **游戏逻辑定时器**：`entity.tickmanager`（帧同步）
- **动画定时器**：`scene.time`（时间同步）

| 旧 API | 新 API | 使用场景 |
|--------|--------|--------|
| `scene.frameTicker.delayedCall({delay, callback})` | `entity.tickmanager.delayedCall({delay, callback})` | 游戏逻辑延迟 |
| `scene.frameTicker.addEvent({...})` | `entity.tickmanager.addEvent({...})` | 游戏逻辑循环 |
| `scene.tweens.add(...)` | `scene.tweens.add(...)` | 动画效果（保持不变） |

#### 迁移示例

**旧代码（冰冻炸弹）**:
```typescript
scene.frameTicker.delayedCall({
  delay: 500,
  callback: () => {
    this.setVisible(false);
    // 发射激光
  }
});
```

**新代码**:
```typescript
entity.tickmanager.delayedCall({
  delay: 500,
  callback: () => {
    entity.setVisible(false);
    // 发射激光
  }
});
```

## ⚠️ 状态变化的 Post-Update 模式

### 为什么状态变化必须使用 Cmd 系统？

在游戏逻辑中，任何状态变化（如生命值、睡眠状态等）**都必须通过 Cmd 系统进行**，而不能直接修改属性。

这是因为需要 **post-update 的正确处理**：

```
Frame N:
  ├─ Game Logic Update (游戏逻辑更新)
  │   └─ 触发事件、计算伤害等
  ├─ State Changes (状态变化 - 延迟到这里)  ← 通过 DeferredManager
  │   └─ 应用所有 Cmd 的状态变化
  └─ Render (渲染) ← 确保渲染时状态已更新
```

**核心原因**：
- ✅ 保证同一帧内的所有状态变化在逻辑更新**后**应用
- ✅ 避免在逻辑运行中途改变状态导致的不一致性
- ✅ 支持多个系统并行更新而不产生冲突
- ✅ 便于调试和日志追踪

### PlantCmd 的状态变化方法

#### 1️⃣ SetHealth - 改变生命值

```typescript
import { PlantCmd } from "../../../utils/cmd/PlantCmd";

// ❌ 错误 - 直接修改（会导致 post-update 问题）
plant.currentHealth = newHealth;

// ✅ 正确 - 使用 PlantCmd
PlantCmd.SetHealth(plant, newHealth);
```

**何时使用**：
- 治疗（如 Generator 的恢复）
- 伤害处理（但通常由 CombatEntity 自动处理）
- 初始化生命值

**完整示例**（Generator 星屑能力）：

```typescript
onStarShards(entity: GeneratorEntity): void {
  // ✅ 使用 PlantCmd 恢复血量
  PlantCmd.SetHealth(entity, entity.maxHealth);
  entity.playAwakAnimation();
}
```

#### 2️⃣ SetSleeping - 改变睡眠状态

```typescript
import { PlantCmd } from "../../../utils/cmd/PlantCmd";

// ❌ 错误 - 直接调用方法
plant.setSleeping(true);

// ✅ 正确 - 使用 PlantCmd
PlantCmd.SetSleeping(plant, true);
```

**何时使用**：
- 日夜切换时改变睡眠状态
- 星屑能力唤醒周围植物
- 特殊事件改变睡眠状态

**完整示例**（Generator 唤醒周围植物）：

```typescript
onStarShards(entity: GeneratorEntity): void {
  // 唤醒自己和周围3x3范围内的所有队友
  for (let i = entity.col - 1; i <= entity.col + 1; i++) {
    for (let j = entity.row - 1; j <= entity.row + 1; j++) {
      const gridWidth = PositionManager.Instance.Col_Number || 10;
      const gridHeight = PositionManager.Instance.Row_Number || 5;

      if (i >= 0 && i < gridWidth && j >= 0 && j < gridHeight) {
        const key = `${i}-${j}`;
        const plantList = PlantsManager.Instance.PlantsMap.get(key);
        if (plantList) {
          for (const plant of plantList) {
            // ✅ 使用 PlantCmd.SetSleeping 而不是直接调用
            PlantCmd.SetSleeping(plant, false);
          }
        }
      }
    }
  }

  // 恢复自己的血量
  PlantCmd.SetHealth(entity, entity.maxHealth);
}
```

### 手动使用 DeferredManager

如果需要的状态变化**没有对应的 Cmd 方法**，可以**直接使用 DeferredManager**：

```typescript
import { DeferredManager } from "../../managers/DeferredManager";

// 当需要修改自定义状态时
DeferredManager.Instance.defer(() => {
  entity.customProperty = newValue;
  // 其他状态变化也在这里
});
```

**示例：修改自定义计数器**

```typescript
// ❌ 错误 - 直接修改（会导致同帧冲突）
entity.cooldownCounter -= deltaTime;

// ✅ 正确 - 使用 DeferredManager
DeferredManager.Instance.defer(() => {
  entity.cooldownCounter -= deltaTime;
});
```

### DeferredManager 的工作原理

```typescript
// managers/DeferredManager.ts
export class DeferredManager {
  private static queue: Array<() => void> = [];

  // 游戏逻辑期间调用此方法排队状态变化
  static defer(callback: () => void) {
    this.queue.push(callback);
  }

  // 在 post-update 阶段执行所有排队的变化
  executeDeferred() {
    while (this.queue.length > 0) {
      const callback = this.queue.shift();
      callback?.();
    }
  }
}
```

**执行时机**：
1. 游戏逻辑层运行（Model 中的回调）
2. 所有 `defer()` 调用被排队但**不立即执行**
3. 逻辑完成后，`executeDeferred()` 一次性执行所有排队的变化
4. 然后进行渲染（此时状态已完全更新）

### 最佳实践总结

#### ✅ DO: 状态变化必须通过 Cmd 或 DeferredManager

```typescript
// ✅ 正确
PlantCmd.SetHealth(entity, 100);
PlantCmd.SetSleeping(entity, true);
PlantCmd.Create(model, scene, col, row, level);
DeferredManager.Instance.defer(() => {
  entity.customProperty = newValue;
});
```

#### ❌ DON'T: 直接修改状态

```typescript
// ❌ 错误 - 同帧状态冲突
entity.currentHealth = 100;
entity.setSleeping(true);
entity.customCounter = 0;

// ❌ 错误 - 在逻辑运行中途改变状态
onCreate(entity: MyEntity): void {
  entity.isSleeping = false;  // ❌ 这会导致其他逻辑看到不一致的状态
  // 逻辑继续...
}
```

#### ✅ DO: 在 Model 的回调中使用 Cmd

```typescript
onCreate(entity: GeneratorEntity): void {
  entity.tickmanager.addEvent({
    callback: () => {
      // ✅ 在逻辑回调中使用 Cmd
      PlantCmd.SetHealth(entity, entity.maxHealth);
      PlantCmd.SetSleeping(entity, false);
    }
  });
}

onStarShards(entity: GeneratorEntity): void {
  // ✅ 星屑能力中使用 Cmd
  PlantCmd.SetHealth(entity, entity.maxHealth);
  
  for (const plant of plantList) {
    PlantCmd.SetSleeping(plant, false);
  }
}
```

#### ✅ DO: 检查状态但不在逻辑中改变它

```typescript
onCreate(entity: MyEntity): void {
  entity.tickmanager.addEvent({
    callback: () => {
      // ✅ 检查状态是安全的
      if (entity.isSleeping) return;
      if (entity.currentHealth <= 0) return;
      
      // 执行逻辑...
      
      // ✅ 如果需要改变状态，使用 Cmd
      if (someCondition) {
        PlantCmd.SetHealth(entity, entity.currentHealth - damage);
      }
    }
  });
}
```

### 迁移检查清单

如果你的代码中还有直接修改状态的地方，请按以下步骤迁移：

- [ ] 找出所有直接修改 `currentHealth` 的地方 → 替换为 `PlantCmd.SetHealth()`
- [ ] 找出所有直接调用 `setSleeping()` 的地方 → 替换为 `PlantCmd.SetSleeping()`
- [ ] 找出所有其他直接修改实体属性的地方 → 使用 `DeferredManager.Instance.defer()`
- [ ] 确保所有状态变化都在 Model 的回调中进行
- [ ] 测试是否有同帧状态冲突（通常表现为 UI 不更新或逻辑错误）

### 高级示例：Obsidian 的护盾系统

黑曜石植物有一个**自定义运行时状态**：护盾血量（`shieldHealth`）。这个例子展示了如何正确处理自定义属性的延迟更新。

#### Model 层：护盾伤害处理

```typescript
export class ObsidianModel extends PlantModel {
  maxShieldHealth = 6000;

  onHurt(entity: ObsidianEntity, damage: number, _realDamage: number, _dealer?: BaseEntity): void {
    // 护盾衰减系数：9级为 0.8，其他为 1.0
    const shieldRatio = entity.level >= 9 ? 0.8 : 1.0;
    const actualDamage = damage * shieldRatio;

    // 如果护盾足以吸收伤害
    if (entity.shieldHealth > actualDamage) {
      // ✅ 创建 Entity 方法来使用 DeferredManager 更新护盾
      entity.updateShieldHealth(entity.shieldHealth - actualDamage);
    } else {
      // 护盾不足，先扣护盾的等量伤害
      const remainingDamage = damage - Math.ceil(entity.shieldHealth / shieldRatio);
      
      // ✅ 更新护盾为 0
      entity.updateShieldHealth(0);
      
      // 剩余伤害扣基础血量（使用 PlantCmd）
      if (remainingDamage > 0) {
        PlantCmd.SetHealth(entity, Math.max(0, entity.currentHealth - remainingDamage));
      }
    }

    // 更新显示帧
    entity.updateDisplayFrame();
  }

  onStarShards(entity: ObsidianEntity): void {
    // 恢复护盾和血量
    entity.updateShieldHealth(this.maxShieldHealth);
    PlantCmd.SetHealth(entity, entity.maxHealth);
    entity.updateDisplayFrame();
    entity.playShieldActivateAnimation();
  }
}
```

#### Entity 层：护盾状态管理

```typescript
export class ObsidianEntity extends PlantEntity {
  // 运行时护盾血量（独立于基础血量）
  public shieldHealth: number = 0;
  private shieldHealthMax: number = 6000;

  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, ObsidianData, level);
    this.shieldHealth = 0; // 初始化无护盾
    this.updateDisplayFrame();
  }

  /**
   * 更新护盾血量 - 使用 DeferredManager 延迟处理
   * 
   * 这确保护盾血量变化在 post-update 阶段才被应用
   * 
   * **重要**：为什么要用 Entity 方法包装 DeferredManager？
   * - 集中管理自定义属性的更新逻辑
   * - 使用简单，调用者不需要知道 DeferredManager 的细节
   * - 便于添加额外的逻辑（如范围约束、日志等）
   */
  public updateShieldHealth(newShieldHealth: number): void {
    DeferredManager.Instance.defer(() => {
      // 确保护盾血量在有效范围内 [0, maxShieldHealth]
      this.shieldHealth = Math.max(0, Math.min(newShieldHealth, this.shieldHealthMax));
    });
  }

  /**
   * 根据护盾/血量状态更新显示帧
   * 
   * 帧映射：
   * - 0: 无护盾，血量 > 66%
   * - 1: 无护盾，血量 33-66%
   * - 2: 无护盾，血量 < 33%
   * - 3: 有护盾，护盾 > 66%
   * - 4: 有护盾，护盾 33-66%
   * - 5: 有护盾，护盾 < 33%
   */
  public updateDisplayFrame(): void {
    const sprite = this.viewGroup.getChildren()[0] as Phaser.GameObjects.Sprite;
    if (!sprite) return;

    if (this.currentHealth <= 0) return;

    // 有护盾时的帧显示
    if (this.shieldHealth > 0) {
      if (this.shieldHealth > this.shieldHealthMax * (2 / 3)) {
        sprite.setFrame(3);
      } else if (this.shieldHealth > this.shieldHealthMax * (1 / 3)) {
        sprite.setFrame(4);
      } else {
        sprite.setFrame(5);
      }
    } else {
      // 无护盾时的帧显示
      if (this.currentHealth > this.maxHealth * (2 / 3)) {
        sprite.setFrame(0);
      } else if (this.currentHealth > this.maxHealth * (1 / 3)) {
        sprite.setFrame(1);
      } else {
        sprite.setFrame(2);
      }
    }
  }
}
```

#### 关键模式

1. **创建 Entity 方法包装 DeferredManager**
   ```typescript
   // ✅ 好：在 Entity 中创建方法
   entity.updateShieldHealth(newValue);
   
   // ❌ 避免：在 Model 中直接使用 DeferredManager
   // 虽然可行，但混淆了关注点
   ```

2. **在 Model 的回调中使用 Entity 方法**
   ```typescript
   // ✅ 正确位置
   onHurt(entity: ObsidianEntity, damage: number): void {
     entity.updateShieldHealth(newValue); // Model 调用 Entity 的方法
   }
   ```

3. **组合 PlantCmd 和自定义方法**
   ```typescript
   onStarShards(entity: ObsidianEntity): void {
     // ✅ 混合使用
     entity.updateShieldHealth(this.maxShieldHealth); // 自定义状态
     PlantCmd.SetHealth(entity, entity.maxHealth);     // 标准状态
     entity.updateDisplayFrame();                      // 更新视图
   }
   ```

## ⚠️ PlantLibrary 取代 PlantFactoryMap

### 示例：南瓜头 (Pumpkin) 的周期性攻击

南瓜头植物展示了如何在 **Model 中管理定时器和攻击逻辑**（参考 dispenser.ts 模式）。

#### Model 层：定时器与攻击逻辑

```typescript
export class PumpkinModel extends PlantModel {
  public override pid = 9;
  public isNightPlant = true;

  private readonly baseAttackInterval = 1950; // 毫秒
  private readonly attackDistance = 4.6; // 格子数
  private readonly laserDuration = 750;

  onCreate(entity: PumpkinEntity): void {
    entity.maxHealth = GetIncValue(300, 1, entity.level);
    entity.currentHealth = entity.maxHealth;

    // ✅ 在 Model 中创建定时器
    const attackInterval = this.getAttackInterval(entity.level);
    const maxDistance = this.attackDistance * PositionManager.Instance.GRID_SIZEX;
    const gameScene = entity.scene as any;

    // ✅ 使用 entity.tickmanager 管理定时器
    entity.tickmanager.addEvent({
      startAt: attackInterval * 0.75, // 第一次延迟
      delay: attackInterval,
      repeat: -1,
      callback: () => {
        if (entity.isSleeping) return;
        if (
          CombatHelper.HasEnemyFactionOnRow(entity.faction, entity.row) &&
          gameScene.monsterSpawner.hasMonsterInRowAfterX(entity.row, entity.x, maxDistance)
        ) {
          // ✅ 调用 Entity 的表现方法
          entity.playAttackAnimation();
          
          // ✅ 在 Model 中定义攻击逻辑
          entity.tickmanager.delayedCall({
            delay: 100,
            callback: () => {
              this.normalShot(entity.scene, entity);
            }
          });
        }
      }
    });
  }

  onStarShards(entity: PumpkinEntity): void {
    // ✅ 大招也在 Model 中管理
    this.masterSpark(entity.scene, entity);
  }

  /**
   * 普通发射 - 在 Model 中定义
   */
  private normalShot(scene: Game, entity: PumpkinEntity): void {
    const laserConfig = {
      damage: GetIncValue(ProjectileDamage.laser.light_laser, 1.35, entity.level),
      faction: entity.faction,
      dealer: entity,
      duration: this.laserDuration,
      distance: this.laserDistance,
    };

    ProjectileCmd.CreateLaser(scene, entity.x, entity.row, laserConfig);
  }

  /**
   * 大招 - 在 Model 中定义
   */
  private masterSpark(scene: Game, entity: PumpkinEntity): void {
    entity.playMasterSparkAnimation(); // 调用表现方法
    
    // 发射激光
    for (let i = Math.max(0, entity.row - 1); i <= Math.min(rowCount - 1, entity.row + 1); i++) {
      ProjectileCmd.CreateLaser(scene, entity.x, i, laserConfig);
    }
  }
}
```

#### Entity 层：只负责表现

```typescript
export class PumpkinEntity extends PlantEntity {
  /**
   * ✅ Entity 只提供表现方法，不管理逻辑
   */
  public playAttackAnimation(): void {
    const sprite = this.viewGroup.getChildren()[0] as Phaser.GameObjects.Sprite;
    if (!sprite) return;

    sprite.setFrame(1);
    this.scene.time.delayedCall(750, () => {
      if (this && this.currentHealth > 0 && sprite) {
        sprite.setFrame(0);
      }
    });
  }

  public playMasterSparkAnimation(): void {
    const sprite = this.viewGroup.getChildren()[0] as Phaser.GameObjects.Sprite;
    if (!sprite) return;

    sprite.setFrame(1);
    this.scene.time.delayedCall(200, () => {
      if (sprite && this.currentHealth > 0) {
        sprite.setFrame(0);
      }
    });
  }
}
```

#### 关键模式对比

| 错误做法 ❌ | 正确做法 ✅ |
|----------|----------|
| Entity 中管理定时器 | **Model** 中通过 `entity.tickmanager.addEvent` 管理定时器 |
| Entity 中实现攻击逻辑 | **Model** 中实现 `normalShot`, `masterSpark` 等逻辑方法 |
| Entity 中存储定时器引用 | Model 中直接在 Entity 的 tickmanager 中创建 |
| 睡眠时手动停止定时器 | 定时器 callback 检查 `entity.isSleeping` 条件 |

#### 重点

```typescript
// ✅ Model 中：所有游戏逻辑和定时器
onCreate(entity: PumpkinEntity): void {
  entity.tickmanager.addEvent({
    callback: () => {
      if (entity.isSleeping) return; // 条件检查
      entity.playAttackAnimation(); // 调用表现方法
      this.normalShot(entity.scene, entity); // 调用逻辑方法
    }
  });
}

// ✅ Entity 中：只提供方法
public playAttackAnimation(): void { /* 动画逻辑 */ }
```

### 什么是 PlantLibrary？

### 什么是 PlantLibrary？

### 什么是 PlantLibrary？

**PlantLibrary** 是植物系统的中央管理器，负责注册、存储和检索所有 `PlantModel` 实例。它是**单例模式**实现，在游戏启动时初始化一次。

```typescript
// managers/library/PlantLibrary.ts
export class PlantLibrary {
  // 存储所有的植物蓝图
  private static models: Map<number, PlantModel> = new Map();

  // 游戏初始化时调用一次，把所有写好的植物注册进去
  public static Initialize() {
    if (this.models.size > 0) return; // 防止重复初始化

    for (const plant of Chapter1Plants) {
      this.Register(plant);
    }

    console.log(`[PlantLibrary] Initialized ${this.models.size} plants.`);
  }

  // 根据 pid 获取蓝图
  public static GetModel(pid: number): PlantModel | undefined {
    return this.models.get(pid);
  }
}
```

### 为什么放弃 PlantFactoryMap？

| 特性 | PlantFactoryMap | PlantLibrary |
|------|-----------------|------------|
| 数据结构 | 静态对象字面量 | 单例 + 私有 Map |
| 初始化时机 | 导入时自动执行 | 显式调用 Initialize() |
| 类型安全 | ❌ 散乱的导入 | ✅ 统一的类型 |
| 防重复注册 | ❌ 无检查 | ✅ 自动检查 |
| 日志追踪 | ❌ 无 | ✅ 完整的初始化日志 |
| 扩展性 | ❌ 新增植物需改动导出 | ✅ 自动注册 |
| 维护性 | ❌ 散布在各文件 | ✅ 集中管理 |

### 如何使用 PlantLibrary？

#### 1️⃣ 游戏启动时初始化（Game.ts 或 Preloader.ts）

```typescript
import { PlantLibrary } from "../managers/library/PlantLibrary";

// 在游戏初始化时调用一次
PlantLibrary.Initialize();
```

#### 2️⃣ 根据 PID 获取植物蓝图

```typescript
import { PlantLibrary } from "../managers/library/PlantLibrary";

// 根据 pid 获取 PlantModel
const plantModel = PlantLibrary.GetModel(2); // pid = 2 是 Furnace

if (plantModel) {
  // 使用 PlantCmd 创建植物
  PlantCmd.Create(plantModel, scene, col, row, level);
}
```

#### 3️⃣ 获取植物属性

```typescript
// 获取种植消耗
const cost = plantModel.cost.getValueAt(level);

// 获取冷却时间
const cooldown = plantModel.cooldown.getValueAt(level);

// 获取伤害
const damage = plantModel.damage.getValueAt(level);
```

### ❌ 不要再使用 PlantFactoryMap

**已弃用**：旧代码中的 `PlantFactoryMap` 不应该再使用。

```typescript
// ❌ 错误 - 已弃用
import PlantFactoryMap from "../../presets/plant";
const record = PlantFactoryMap[pid];
const cost = record.cost(level);

// ✅ 正确 - 使用 PlantLibrary
import { PlantLibrary } from "../../managers/library/PlantLibrary";
const model = PlantLibrary.GetModel(pid);
const cost = model.cost.getValueAt(level);
```

### PlantLibrary 架构优势

#### 1. **集中管理** - 所有植物在一个地方注册

```typescript
// PlantLibrary.Initialize() 时
for (const plant of Chapter1Plants) {
  this.Register(plant);  // ← 统一的注册入口
}
```

#### 2. **类型安全** - 返回类型明确

```typescript
// 返回类型为 PlantModel | undefined
const model: PlantModel | undefined = PlantLibrary.GetModel(10);

if (model) {
  // TypeScript 自动推断 model 的所有属性和方法
  const health = model.maxHealth.getValueAt(level);
}
```

#### 3. **防止重复** - 自动检查 PID 冲突

```typescript
private static Register(model: PlantModel) {
  if (this.models.has(model.pid)) {
    console.warn(`[PlantLibrary] PID ${model.pid} is already registered!`);
    return;  // ← 防止重复注册
  }
  this.models.set(model.pid, model);
}
```

#### 4. **初始化日志** - 便于调试

```typescript
PlantLibrary.Initialize();
// 输出: [PlantLibrary] Initialized 17 plants.
```

### 完整使用示例

#### 场景 1：CursorManager 显示植物预览

```typescript
// managers/combat/CursorManager.ts
import { PlantLibrary } from "../library/PlantLibrary";

export class CursorManager {
  showPlantPreview(pid: number, level: number) {
    const model = PlantLibrary.GetModel(pid);
    
    if (!model) {
      console.error(`Plant with PID ${pid} not found in PlantLibrary`);
      return;
    }

    // 获取植物属性用于显示
    const cost = model.cost.getValueAt(level);
    const cooldown = model.cooldown.getValueAt(level);
    const damage = model.damage.getValueAt(level);

    // 更新 UI 显示
    this.updatePreviewUI({
      name: model.nameKey,
      cost,
      cooldown,
      damage,
      texture: model.texturePath
    });
  }
}
```

#### 场景 2：动态创建植物

```typescript
// Game.ts 中的种植逻辑
import { PlantLibrary } from "../managers/library/PlantLibrary";
import { PlantCmd } from "../utils/cmd/PlantCmd";

function plantSeed(pid: number, col: number, row: number, level: number) {
  const model = PlantLibrary.GetModel(pid);
  
  if (!model) {
    throw new Error(`Plant PID ${pid} not found`);
  }

  // 使用 PlantCmd 创建实体
  PlantCmd.Create(model, scene, col, row, level);
  
  // 消耗能量
  const cost = model.cost.getValueAt(level);
  ResourceCmd.AddEnergyToAll(-cost);
}
```

#### 场景 3：序列化植物进度

```typescript
// save_ctx.tsx 中保存/恢复植物
interface PlantProgress {
  pid: number;
  level: number;
}

export function deserializePlants(plantsList: PlantProgress[]) {
  for (const plant of plantsList) {
    const model = PlantLibrary.GetModel(plant.pid);
    
    if (!model) {
      console.warn(`Skipping unknown plant PID ${plant.pid}`);
      continue;
    }

    // 恢复植物进度
    playerInventory.addPlant(model, plant.level);
  }
}
```

### 迁移清单

如果你的代码中还在使用 `PlantFactoryMap`，请按以下步骤迁移：

- [ ] 移除 `import PlantFactoryMap from "..."`
- [ ] 添加 `import { PlantLibrary } from "..."`
- [ ] 将 `PlantFactoryMap[pid]` 替换为 `PlantLibrary.GetModel(pid)`
- [ ] 将 `record.cost(level)` 替换为 `model.cost.getValueAt(level)`
- [ ] 将 `record.cooldownTime(level)` 替换为 `model.cooldown.getValueAt(level)`
- [ ] 将 `record.texture` 替换为 `model.texturePath`
- [ ] 确保在使用前已调用 `PlantLibrary.Initialize()`

## Cmd 命令系统指南

Cmd 系统是游戏创建实体的核心通道。分别负责创建三大实体类型：**植物**、**投射物**、和**资源更新**。

### 三个核心 Cmd

| Cmd | 职责 | 签名 | 何时使用 |
|-----|------|------|--------|
| **PlantCmd** | 创建植物实体 | `Create<TModel extends PlantModel>(model, scene, col, row, level)` | 种植新植物 |
| **ProjectileCmd** | 创建投射物实体 | `Create<TModel extends ProjectileModel>(model, scene, x, row, cfg)` | 发射子弹/激光/爆炸 |
| **ResourceCmd** | 更新全局资源 | `AddEnergyToAll(amount)` | 改变游戏资源（能量） |

---

### PlantCmd - 植物创建

#### 基本用法

**简洁的泛型调用** - 只需传入 Model 实例，类型自动推导：

```typescript
import { PlantCmd } from "../../utils/cmd/PlantCmd";
import { FurnaceModel } from "../../presets/plant/chapter1/furnace";

// 在 Model 的 onCreate 回调中创建相关植物
onCreate(entity: SomeEntity): void {
  const furnaceModel = new FurnaceModel();
  
  // ✅ 直接传入 Model，配置参数自动推导
  PlantCmd.Create(furnaceModel, this.scene, col, row, level);
}
```

#### 何时使用 PlantCmd

| 场景 | 示例 | 说明 |
|------|------|------|
| **植物种植** | 用户点击种植 Furnace | 常规植物生成 |
| **植物复制** | Lily 星屑能力生成副本 | 逻辑生成的植物 |
| **植物召唤** | 某些特殊技能 | 动态生成 |

#### 完整示例：Lily 生成分身

```typescript
// LilyModel.ts
export class LilyModel extends PlantModel {
  onStarShards(entity: LilyEntity): void {
    const scene = entity.scene as Game;
    
    // 在周围3x3的水地形种植 Lily 副本
    for (let i = entity.col - 1; i <= entity.col + 1; i++) {
      for (let j = entity.row - 1; j <= entity.row + 1; j++) {
        if (i < 0 || i >= PositionManager.Instance.Col_Number ||
            j < 0 || j >= PositionManager.Instance.Row_Number) {
          continue;
        }
        if (i === entity.col && j === entity.row) continue;
        
        // 检查地形是否为水
        const gridProp = GridManager.Instance.GetGridProperty(i, j);
        if (!gridProp || gridProp.type !== 'water') {
          continue;
        }
        
        // ✅ 使用 PlantCmd 创建
        PlantCmd.Create(new LilyModel(), scene, i, j, entity.level);
      }
    }
  }
}
```

---

### ProjectileCmd - 投射物创建

#### 基本用法

**同样简洁的泛型设计** - 配置参数自动推导：

```typescript
import { ProjectileCmd } from "../../utils/cmd/ProjectileCmd";
import { BulletModel, BulletConfig } from "../../models/projectiles/ProjectileModels";

// 在 Model 的定时器回调中发射投射物
onCreate(entity: SomeEntity): void {
  entity.tickmanager.addEvent({
    startAt: 500,
    delay: 3000,
    repeat: -1,
    callback: () => {
      // ✅ 直接传入 Model 和配置，类型自动推导
      const bulletCfg: BulletConfig = {
        damage: 150,
        speed: 200,
        targetCamp: 'zombie'
      };
      ProjectileCmd.Create(new BulletModel(), scene, centerX, row, bulletCfg);
    }
  });
}
```

#### 何时使用 ProjectileCmd

| 场景 | 示例 | 配置类型 |
|------|------|---------|
| **子弹发射** | Dispenser 射箭 | `BulletConfig` |
| **爆炸效果** | TNT 或投掷爆炸 | `ExplosionConfig` |
| **激光发射** | Pumpkin Wan 发射激光 | `LaserConfig` |
| **范围攻击** | 冰冻炸弹范围冻结 | `ExplosionConfig` |

#### 完整示例：Dispenser 发射子弹

```typescript
// DispenserModel.ts
import { ProjectileCmd } from "../../utils/cmd/ProjectileCmd";
import { BulletModel, BulletConfig } from "../../models/projectiles/ProjectileModels";

export class DispenserModel extends PlantModel {
  shootCooldown = new PlantStat(3000).setDecValue(0.95);
  shootDamage = new PlantStat(150).setIncValue(0.2);

  onCreate(entity: DispenserEntity): void {
    const cooldown = this.shootCooldown.getValueAt(entity.level);
    
    entity.tickmanager.addEvent({
      startAt: cooldown * 0.5,
      delay: cooldown,
      repeat: -1,
      callback: () => {
        if (entity.isSleeping || entity.currentHealth <= 0) return;
        
        // 获取发射位置
        const { x, y } = PositionManager.Instance.getPlantBottomCenter(
          entity.col, 
          entity.row
        );
        
        // ✅ 发射子弹
        const bulletCfg: BulletConfig = {
          damage: this.shootDamage.getValueAt(entity.level),
          speed: 250,
          targetCamp: 'zombie'
        };
        ProjectileCmd.Create(
          new BulletModel(), 
          entity.scene, 
          x, 
          entity.row, 
          bulletCfg
        );
        
        // 播放动画反馈
        entity.playShootAnimation();
      }
    });
  }
}
```

---

### ResourceCmd - 资源更新

#### 基本用法

**简单直接的资源操作**：

```typescript
import { ResourceCmd } from "../../utils/cmd/ResourceCmd";
import { ResourceManager } from "../../managers/combat/ResourceManager";

// 在植物的游戏逻辑中更新资源
onCreate(entity: FurnaceEntity): void {
  entity.tickmanager.addEvent({
    startAt: cooldown * 0.7,
    delay: cooldown,
    repeat: -1,
    callback: () => {
      if (entity.isSleeping || entity.currentHealth <= 0) return;
      
      // ✅ 增加能量
      const energyToAdd = this.generateEnergyAmount.getValueAt(entity.level);
      ResourceCmd.AddEnergyToAll(energyToAdd);
      
      entity.playGenerateAnimation();
    }
  });
}
```

#### 何时使用 ResourceCmd

| 资源类型 | 操作方法 | 何时触发 |
|---------|--------|--------|
| **能量增加** | `AddEnergyToAll(amount)` | Furnace 生成、Lily 星屑能力 |
| **能量减少** | `AddEnergyToAll(-amount)` | 种植消耗、技能消耗 |
| **星屑增加** | `AddStarshardToAll(amount)` | 击杀怪物、特殊奖励 |

#### 完整示例：Furnace 生成能量

```typescript
// FurnaceModel.ts
import { ResourceCmd } from "../../utils/cmd/ResourceCmd";

export class FurnaceModel extends PlantModel {
  generateEnergyCooldown = new PlantStat(25000).setDecValue(0.85);
  generateEnergyAmount = new PlantStat(25).setThreshold(9, 40);

  onCreate(entity: FurnaceEntity): void {
    const cooldownTime = this.generateEnergyCooldown.getValueAt(entity.level);
    
    entity.tickmanager.addEvent({
      startAt: cooldownTime * 0.7,
      delay: cooldownTime,
      repeat: -1,
      callback: () => {
        if (entity.isSleeping || entity.currentHealth <= 0) return;
        
        // ✅ 通过 ResourceCmd 增加能量
        const energyToAdd = this.generateEnergyAmount.getValueAt(entity.level);
        ResourceCmd.AddEnergyToAll(energyToAdd);
        
        // 触发动画反馈
        entity.playGenerateAnimation();
      }
    });
  }

  onStarShards(entity: FurnaceEntity): void {
    // ✅ 星屑能力：一次性增加大量能量
    ResourceCmd.AddEnergyToAll(450);
  }
}
```

---

### 跨 Cmd 调用场景

#### 场景 1：植物发射投射物并消耗资源

```typescript
onCreate(entity: DefenseEntity): void {
  entity.tickmanager.addEvent({
    delay: 2000,
    repeat: -1,
    callback: () => {
      // 1️⃣ 检查资源是否足够
      if (ResourceManager.Instance.CurrentEnergy < 50) return;
      
      // 2️⃣ 使用 ProjectileCmd 发射投射物
      const cfg: ExplosionConfig = { damage: 300 };
      ProjectileCmd.Create(new ExplosionModel(), entity.scene, x, row, cfg);
      
      // 3️⃣ 使用 ResourceCmd 消耗能量
      ResourceCmd.AddEnergyToAll(-50);
      
      entity.playAttackAnimation();
    }
  });
}
```

#### 场景 2：多个植物协同工作

```typescript
// Model A：生成能量
onCreate(furnaceEntity: FurnaceEntity): void {
  // ✅ 生成能量供其他植物使用
  ResourceCmd.AddEnergyToAll(50);
}

// Model B：消耗能量执行攻击
onCreate(defenseEntity: DefenseEntity): void {
  entity.tickmanager.addEvent({
    callback: () => {
      if (ResourceManager.Instance.CurrentEnergy < 100) {
        return; // 等待 Model A 生成能量
      }
      
      // ✅ 发射投射物并消耗能量
      ProjectileCmd.Create(new BulletModel(), scene, x, row, cfg);
      ResourceCmd.AddEnergyToAll(-100);
    }
  });
}
```

---

### 最佳实践

#### ✅ DO: 使用 Cmd 创建所有游戏对象

```typescript
// ✅ 正确：统一通过 Cmd 创建
PlantCmd.Create(model, scene, col, row, level);
ProjectileCmd.Create(model, scene, x, row, cfg);
ResourceCmd.AddEnergyToAll(amount);
```

#### ❌ DON'T: 直接实例化实体

```typescript
// ❌ 错误：绕过 Cmd，直接创建（缺少延迟处理、资源更新等）
const plant = new FurnaceEntity(scene, col, row, level);
```

#### ✅ DO: 在 Model 回调中使用 Cmd

```typescript
onCreate(entity: PlantEntity): void {
  entity.tickmanager.addEvent({
    callback: () => {
      // ✅ 在逻辑回调中调用 Cmd
      PlantCmd.Create(...);
      ProjectileCmd.Create(...);
      ResourceCmd.AddEnergyToAll(...);
    }
  });
}
```

#### ❌ DON'T: 在 Entity 的事件处理中创建对象

```typescript
// ❌ 错误：Entity 层不应该创建新实体
export class PlantEntity {
  someEventHandler() {
    PlantCmd.Create(...); // ❌ Entity 不处理创建逻辑
  }
}
```

---

## 🎯 有限范围射击植物：HasEnemyFactionOnRowInDistance

某些植物（如南瓜头）的攻击有**限定范围**，不能用 `HasEnemyFactionOnRow` 检查整行。使用 `HasEnemyFactionOnRowInDistance` 检查指定范围内的敌人。

### CombatHelper 新增函数

```typescript
/**
 * 检查指定行的指定范围内是否存在敌对阵营
 * 用于有限范围的射击植物（如南瓜头）
 * @param myFaction 己方阵营
 * @param row 目标行
 * @param centerX 中心 X 坐标（像素）
 * @param leftDistanceGrid 左侧范围（格子数）
 * @param rightDistanceGrid 右侧范围（格子数）
 * @returns 是否在范围内存在敌对阵营
 */
export function HasEnemyFactionOnRowInDistance(
  myFaction: Faction,
  row: number,
  centerX: number,
  leftDistanceGrid: number,
  rightDistanceGrid: number
): boolean
```

**内部实现**：
- 将距离从"格子数"转换为像素：`leftDistancePx = leftDistanceGrid * GRID_SIZEX`
- 检查该行的所有**敌方单位**和**敌方植物**是否在范围 `[centerX - leftDistancePx, centerX + rightDistancePx]` 内
- 返回 `true` 如果存在任何敌对目标在范围内

### 单行检查：南瓜头 (Pumpkin)

南瓜头攻击距离 **4.6 格子**，检查中心行范围内是否有敌人：

```typescript
export class PumpkinModel extends PlantModel {
  private readonly attackDistance = 4.6;

  onCreate(entity: PumpkinEntity): void {
    entity.tickmanager.addEvent({
      callback: () => {
        if (entity.isSleeping) return;
        
        // ✅ 检查中心行的左右各 4.6 格子范围内是否有敌人
        if (
          CombatHelper.HasEnemyFactionOnRowInDistance(
            entity.faction,
            entity.row,
            entity.x,
            this.attackDistance,  // 左侧范围
            this.attackDistance   // 右侧范围
          )
        ) {
          entity.playAttackAnimation();
          this.normalShot(entity.scene, entity);
        }
      }
    });
  }
}
```

**配置说明**：
- 参数对称：左右距离都是 `4.6` 格子
- 最终范围：`[entity.x - 4.6*GRID_SIZE, entity.x + 4.6*GRID_SIZE]`

### 多行检查（短路逻辑）：南瓜头·晚上 (PumpkinWan)

南瓜头·晚上发射**上中下三行激光**，**必须三行都有敌人才攻击**。使用 `&&` 短路逻辑：

```typescript
export class PumpkinWanModel extends PlantModel {
  onCreate(entity: PumpkinWanEntity): void {
    entity.tickmanager.addEvent({
      callback: () => {
        if (entity.isSleeping) return;
        
        // 根据等级调整范围
        const startOffset = entity.level >= 9 ? 2.5 : 1.5;
        
        // ✅ 三行都检查，用 && 短路：一旦某行没敌人，立即返回 false
        if (
          CombatHelper.HasEnemyFactionOnRowInDistance(
            entity.faction,
            entity.row - 1,  // 上行
            entity.x,
            startOffset,
            startOffset
          ) &&
          CombatHelper.HasEnemyFactionOnRowInDistance(
            entity.faction,
            entity.row,      // 中行
            entity.x,
            startOffset,
            startOffset
          ) &&
          CombatHelper.HasEnemyFactionOnRowInDistance(
            entity.faction,
            entity.row + 1,  // 下行
            entity.x,
            startOffset,
            startOffset
          )
        ) {
          // 三行都有敌人，才执行攻击
          entity.playAttackAnimation();
          this.normalShot(entity.scene, entity);
        }
      }
    });
  }
}
```

**配置说明**：
- 等级提升增加范围：9级以上 `2.5` 格子，否则 `1.5` 格子
- 三行检查：使用 `&&` 操作符实现**短路**（一旦某行没敌人，后续检查不执行）
- 性能优势：避免不必要的函数调用

### 短路逻辑 vs 嵌套 if 对比

```typescript
// ❌ 嵌套 if - 冗长且效率低
if (hasEnemyUp) {
  if (hasEnemyMid) {
    if (hasEnemyDown) {
      // 执行攻击
    }
  }
}

// ✅ && 短路 - 简洁高效
if (hasEnemyUp && hasEnemyMid && hasEnemyDown) {
  // 执行攻击
}

// ✅ 实际应用中的短路演示
if (
  CombatHelper.HasEnemyFactionOnRowInDistance(...) &&  // 如果上行无敌人，下面两个检查不执行
  CombatHelper.HasEnemyFactionOnRowInDistance(...) &&  // 如果中行无敌人，下面检查不执行
  CombatHelper.HasEnemyFactionOnRowInDistance(...)     // 仅在上两行都有敌人时执行
) {
  // 三行都有敌人时才来这里
}
```

### 常见错误

#### ❌ 错误 1：使用全行检查代替范围检查

```typescript
// ❌ 错误 - HasEnemyFactionOnRow 检查整行，不符合有限范围要求
if (CombatHelper.HasEnemyFactionOnRow(entity.faction, entity.row)) {
  this.normalShot(...);
}
```

#### ❌ 错误 2：南瓜头·晚上的三行检查用 `||` 而不是 `&&`

```typescript
// ❌ 错误 - 用 || 表示"至少一行有敌人就攻击"
// 但南瓜头·晚上应该"三行都有敌人才攻击"
if (
  CombatHelper.HasEnemyFactionOnRowInDistance(...top...) ||
  CombatHelper.HasEnemyFactionOnRowInDistance(...mid...) ||
  CombatHelper.HasEnemyFactionOnRowInDistance(...bottom...)
) {
  // ❌ 这会导致只有一行有敌人时也发射激光
}
```

#### ✅ 正确 3：南瓜头·晚上必须用 `&&`

```typescript
// ✅ 正确 - 用 && 表示"三行都有敌人才攻击"
if (
  CombatHelper.HasEnemyFactionOnRowInDistance(...top...) &&
  CombatHelper.HasEnemyFactionOnRowInDistance(...mid...) &&
  CombatHelper.HasEnemyFactionOnRowInDistance(...bottom...)
) {
  // ✅ 三行都有敌人时才发射激光
}
```

---

**更新时间**: 2026-04-18  
**相关文件**: [`src/game/presets/plant/chapter1/`](src/game/presets/plant/chapter1/)
