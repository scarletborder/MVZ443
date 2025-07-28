# 存档系统使用指南

## 概述

本项目使用 Dexie.js 重写了存档系统，提供了更简洁、直观的 ORM 风格的 CRUD 操作。新的存档系统具有以下特点：

- 🚀 **简洁的 API**：使用 async/await 语法，代码更易读
- 🛡️ **类型安全**：完整的 TypeScript 支持
- 📊 **自动管理**：Dexie.js 自动处理数据库版本和索引
- 🔄 **事务支持**：内置事务处理，数据一致性保证
- 📱 **离线支持**：基于 IndexedDB，完全离线工作

## 安装依赖

```bash
npm install dexie
```

## 基本使用

### 1. 在 React 组件中使用

```tsx
import React from 'react';
import { useSaveManager } from '../context/save_ctx';

function GameComponent() {
    const gameManager = useSaveManager();

    const handleSave = async () => {
        try {
            // 记录游戏进度
            gameManager.recordPlantEncounter(5);
            gameManager.setPlantLevel(1, 3);
            gameManager.updateItemCount(1, 10);
            
            // 保存进度
            await gameManager.saveProgress();
            console.log('进度保存成功');
        } catch (error) {
            console.error('保存失败:', error);
        }
    };

    const handleLoad = async () => {
        try {
            await gameManager.loadProgress();
            console.log('进度加载成功');
        } catch (error) {
            console.error('加载失败:', error);
        }
    };

    return (
        <div>
            <button onClick={handleSave}>保存游戏</button>
            <button onClick={handleLoad}>加载游戏</button>
        </div>
    );
}
```

### 2. 在普通类中使用

```typescript
import { GameManager } from '../context/save_ctx';

class GameController {
    private gameManager: GameManager;

    constructor() {
        this.gameManager = new GameManager();
    }

    async saveGame() {
        try {
            await this.gameManager.saveProgress();
            console.log('游戏已保存');
        } catch (error) {
            console.error('保存失败:', error);
        }
    }
}
```

## API 参考

### GameManager 类

#### 属性

- `currentProgress: GameProgress` - 获取当前游戏进度

#### 方法

##### 进度管理

```typescript
// 保存当前进度
async saveProgress(): Promise<void>

// 加载进度
async loadProgress(): Promise<void>

// 重置为默认进度
resetToDefault(): void
```

##### 游戏数据操作

```typescript
// 记录遇到的植物
recordPlantEncounter(pid: number): void

// 记录遇到的僵尸
recordZombieEncounter(mid: number): void

// 设置植物等级
setPlantLevel(pid: number, level: number): void

// 更新物品数量
updateItemCount(type: number, count: number): void

// 设置当前关卡
setCurrentLevel(level: number): void

// 更新卡槽数量
updateSlotNum(num: number): void
```

##### 存档导入导出

```typescript
// 导入存档
async importSave(jsonString: string): Promise<void>

// 导出存档
async exportSave(): Promise<string>

// 删除存档
async deleteSave(): Promise<void>

// 获取存档信息
async getSaveInfo(): Promise<{ count: number; lastUpdated?: Date }>
```

## 数据模型

### GameProgress 接口

```typescript
interface GameProgress {
    id?: number;           // 数据库主键（自动管理）
    level: Set<number>;    // 已解锁的关卡
    plants: Plant[];       // 植物列表
    zombies: Zombie[];     // 僵尸列表
    items: Map<number, Item>; // 物品库存
    slotNum: number;       // 卡槽数量
    updatedAt: Date;       // 最后更新时间
}
```

### 子接口

```typescript
interface Plant {
    pid: number;   // 植物ID
    level: number; // 植物等级
}

interface Zombie {
    mid: number;   // 僵尸ID
}

interface Item {
    type: number;  // 物品类型
    count: number; // 物品数量
}
```

## 使用示例

### 完整游戏流程示例

```typescript
import { GameManager } from '../context/save_ctx';

async function gameFlowExample() {
    const gameManager = new GameManager();

    try {
        // 1. 游戏开始时加载进度
        await gameManager.loadProgress();
        console.log('游戏进度已加载');

        // 2. 游戏过程中记录进度
        gameManager.recordPlantEncounter(5);  // 遇到新植物
        gameManager.setPlantLevel(1, 3);      // 升级植物
        gameManager.updateItemCount(1, 10);   // 获得物品
        gameManager.setCurrentLevel(2);       // 解锁新关卡

        // 3. 定期保存进度
        await gameManager.saveProgress();
        console.log('进度已保存');

        // 4. 获取存档信息
        const saveInfo = await gameManager.getSaveInfo();
        console.log('存档信息:', saveInfo);

        // 5. 导出存档（用于备份或分享）
        const exportData = await gameManager.exportSave();
        console.log('存档数据:', exportData);

    } catch (error) {
        console.error('游戏流程出错:', error);
    }
}
```

### 存档导入示例

```typescript
async function importSaveExample() {
    const gameManager = new GameManager();
    
    // 模拟的存档数据
    const saveData = {
        level: [1, 2, 3],
        plants: [
            { pid: 1, level: 5 },
            { pid: 2, level: 3 }
        ],
        zombies: [
            { mid: 1 },
            { mid: 2 }
        ],
        items: [
            { id: 1, type: 1, count: 50 },
            { id: 2, type: 2, count: 20 }
        ],
        slotNum: 10,
        updatedAt: new Date().toISOString()
    };

    try {
        await gameManager.importSave(JSON.stringify(saveData));
        console.log('存档导入成功');
    } catch (error) {
        console.error('导入失败:', error);
    }
}
```

## 错误处理

所有异步操作都使用 try-catch 进行错误处理：

```typescript
try {
    await gameManager.saveProgress();
    console.log('保存成功');
} catch (error) {
    console.error('保存失败:', error);
    // 处理错误，比如显示用户提示
}
```

## 性能优化

1. **批量操作**：Dexie.js 支持批量操作，可以一次性处理多条记录
2. **索引优化**：数据库会自动创建索引，提高查询性能
3. **内存管理**：及时释放不需要的数据库连接

## 注意事项

1. **异步操作**：所有数据库操作都是异步的，需要使用 async/await
2. **错误处理**：始终使用 try-catch 处理可能的错误
3. **数据验证**：在保存前验证数据的有效性
4. **备份策略**：定期导出存档数据作为备份

## 迁移指南

如果你之前使用的是原生 IndexedDB 实现，迁移到新的 Dexie.js 系统：

1. 安装 Dexie.js：`npm install dexie`
2. 更新导入语句
3. 将回调函数改为 async/await
4. 更新错误处理逻辑

新的 API 更加简洁，代码更易维护！ 