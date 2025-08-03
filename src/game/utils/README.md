# GameStateManager - 游戏状态管理器

## 概述

GameStateManager 是一个单例模式的状态管理器，用于在 Phaser 游戏逻辑和 React 组件之间提供同步的状态访问。

## 问题背景

在重构网络队列和通信模块时，发现 Phaser 游戏逻辑需要同步获取当前的能量值和星之碎片数量，但这些状态由 React 组件管理。需要一个同步的机制来桥接这两个系统。

## 解决方案

### 1. GameStateManager 单例

- 提供同步的 `getCurrentEnergy()` 和 `getCurrentStarShards()` 方法
- 维护当前的能量和星之碎片状态
- 支持状态更新监听器

### 2. React 集成

在 `src/context/garden_ctx.tsx` 中：
- 每次能量或星之碎片更新时，同步更新 GameStateManager
- 确保游戏逻辑能够实时获取到正确的状态值

### 3. 网络队列集成

在 `src/game/sync/queue_send.ts` 中：
- `sendCardPlant()` 和 `sendStarShards()` 方法现在使用 GameStateManager 获取当前状态
- 自动从 PlantFactoryMap 获取正确的消耗值

## 使用方法

### 在 Phaser 游戏逻辑中获取状态

```typescript
import { gameStateManager } from '../utils/GameStateManager';

// 同步获取当前能量
const currentEnergy = gameStateManager.getCurrentEnergy();

// 同步获取当前星之碎片
const currentStarShards = gameStateManager.getCurrentStarShards();
```

### 监听状态变化

```typescript
// 监听能量变化
gameStateManager.onEnergyUpdate((energy) => {
    console.log('能量更新:', energy);
});

// 监听星之碎片变化
gameStateManager.onStarShardsUpdate((starShards) => {
    console.log('星之碎片更新:', starShards);
});
```

## 优势

1. **同步访问**: 游戏逻辑可以同步获取 React 状态，无需异步调用
2. **实时更新**: 状态变化立即反映到游戏逻辑中
3. **类型安全**: 使用 TypeScript 确保类型安全
4. **单例模式**: 全局唯一实例，避免状态不一致
5. **监听机制**: 支持状态变化监听，便于响应式更新

## 注意事项

- GameStateManager 在应用启动时自动初始化
- React 组件负责更新状态，GameStateManager 负责提供同步访问
- 所有状态访问都是同步的，适合游戏逻辑的实时需求 