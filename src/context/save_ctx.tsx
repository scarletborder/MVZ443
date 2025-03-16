import React, { createContext, useContext, useState, ReactNode } from "react";

interface Plant {
    pid: number;
    level: number;
}

interface Zombie {
    mid: number;
}

interface Item {
    type: number;
    count: number;
}

export interface GameProgress {
    level: Set<number>;
    plants: Plant[];
    zombies: Zombie[];
    items: Map<number, Item>; // 物品id -> Item
    slotNum: number // 卡槽数量
}

// 将 GameProgress 转换为可序列化的对象
function serializeGameProgress(gameProgress: GameProgress): object {
    return {
        level: Array.from(gameProgress.level),  // Set 转换为数组
        plants: gameProgress.plants,  // 数组本身可以直接序列化
        zombies: gameProgress.zombies,  // 数组本身可以直接序列化
        items: Array.from(gameProgress.items.entries()).map(([key, value]) => ({
            id: key,  // Map 的 key 转为 id 字段
            ...value  // 保留原有的 Item 属性
        })),
        slotNum: gameProgress.slotNum,  // 直接序列化
    };
}

// 将 JSON 字符串解析回 GameProgress 对象
function deserializeGameProgress(jsonString: string): GameProgress {
    const obj = JSON.parse(jsonString);

    return {
        level: new Set(obj.level),  // 将数组转换回 Set
        plants: obj.plants,  // 保持原数组格式
        zombies: obj.zombies,  // 保持原数组格式
        items: new Map(obj.items.map((item: { id: number, type: number, count: number }) => [item.id, { type: item.type, count: item.count }])),  // Map 转换
        slotNum: obj.slotNum,  // 直接赋值
    };
}


class SaveManager {
    private dbName: string = "MVZ443";
    private storeName: string = "game_progress";

    constructor() {
        this.init();
    }

    private init(): void {
        const request = indexedDB.open(this.dbName, 1);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBRequest).result;
            if (!db.objectStoreNames.contains(this.storeName)) {
                db.createObjectStore(this.storeName, { keyPath: "id" }); // 移除 autoIncrement
            }
        };

        request.onerror = (event) => {
            console.error("数据库初始化失败: ", event);
        };
    }

    saveGameProgress(gameProgress: GameProgress): void {
        const request = indexedDB.open(this.dbName, 1);

        request.onsuccess = (event) => {
            const db = (event.target as IDBRequest).result;
            const transaction = db.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            // 使用固定的 id: 0，确保覆盖更新同一记录
            const dataToSave = { id: 0, ...gameProgress };
            const putRequest = store.put(dataToSave);

            putRequest.onsuccess = () => {
                console.log("游戏进度保存成功");
            };

            putRequest.onerror = () => {
                console.error("保存存档失败");
            };
        };

        request.onerror = (event) => {
            console.error("数据库打开失败: ", event);
        };
    }

    loadGameProgress(callback: (gameProgress: GameProgress | undefined) => void): void {
        const request = indexedDB.open(this.dbName, 1);

        request.onsuccess = (event) => {
            const db = (event.target as IDBRequest).result;
            const transaction = db.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const getRequest = store.get(0); // 使用固定的 id: 0

            getRequest.onsuccess = () => {
                callback(getRequest.result ? getRequest.result : undefined);
            };

            getRequest.onerror = () => {
                console.error("读取存档失败");
                callback(undefined);
            };
        };

        request.onerror = (event) => {
            console.error("数据库打开失败: ", event);
            callback(undefined);
        };
    }

    importSaveFromJson(jsonString: string): GameProgress | undefined {
        try {
            const gameProgress = deserializeGameProgress(jsonString);
            this.saveGameProgress(gameProgress);
            return gameProgress
        } catch (error) {
            console.error("导入存档失败: ", error);
        }
    }
}


export class GameManager {
    saveManager: SaveManager;
    currentProgress: GameProgress;

    constructor() {
        this.saveManager = new SaveManager();
        this.currentProgress = {
            level: new Set([1]),
            plants: [{ pid: 1, level: 1 }, { pid: 2, level: 1 }, { pid: 3, level: 1 }, { pid: 4, level: 1 }],
            zombies: [],
            items: new Map<number, Item>(),
            slotNum: 6,
        };
        this.loadProgress();
    }

    // 记录遇到的植物
    recordPlantEncounter(pid: number): void {
        const existingPlant = this.currentProgress.plants.find((p) => p.pid === pid);
        if (!existingPlant) {
            this.currentProgress.plants.push({ pid, level: 1 });
        }
    }

    // 记录遇到的僵尸
    recordZombieEncounter(mid: number): void {
        const existingZombie = this.currentProgress.zombies.find((z) => z.mid === mid);
        if (!existingZombie) {
            this.currentProgress.zombies.push({ mid });
        }
    }

    // 设置植物的等级
    setPlantLevel(pid: number, level: number): void {
        const plant = this.currentProgress.plants.find((p) => p.pid === pid);
        if (plant && level > plant.level) {
            plant.level = level;
        }
    }

    /**
     * 更新物品数量,  add or decrease
     * @param type 
     * @param count 
     */
    updateItemCount(type: number, count: number): void {
        // 原有数量
        let oldItem = this.currentProgress.items.get(type);
        if (!oldItem) {
            oldItem = { type, count: 0 };
        }

        // 设置新的数量
        this.currentProgress.items.set(type, {
            type, count: oldItem.count + count
        });
    }

    // 记录当前关卡进度
    // 调用时需要循环对所有要解锁的关卡调用
    setCurrentLevel(level: number): void {
        this.currentProgress.level.add(level);
    }

    // 更新卡槽数量
    updateSlotNum(num: number): void {
        if (num > this.currentProgress.slotNum) this.currentProgress.slotNum = num;
    }

    // 保存当前游戏进度
    saveProgress(): void {
        this.saveManager.saveGameProgress(this.currentProgress);
    }

    // 加载当前游戏进度 (确保更更新的记录覆盖现有记录)
    loadProgress(callback?: () => void): void {
        this.saveManager.loadGameProgress((gameProgress) => {
            if (gameProgress) {
                this.currentProgress.level = gameProgress.level;
                this.currentProgress.plants = gameProgress.plants;
                this.currentProgress.zombies = gameProgress.zombies;
                this.currentProgress.items = gameProgress.items;
                this.currentProgress.slotNum = gameProgress.slotNum;

                if (callback) {
                    callback();
                }
            } else {
                console.log("没有找到存档，初始化默认进度");
            }
        });
    }

    // 导入游戏存档
    importSave(jsonString: string): void {
        let progress = this.saveManager.importSaveFromJson(jsonString);
        if (progress === undefined) {
            console.log("导入存档失败");
        } else {
            this.currentProgress = progress;
        }
    }

    // 导出游戏存档
    exportSave(callback: (jsonString: string) => void): void {
        // 将所有set做成 []
        // 将所有map做成 []
        const obj = serializeGameProgress(this.currentProgress);
        let jsonStr = JSON.stringify(obj);
        callback(jsonStr);
    }
}

// 创建一个 React Context 用于提供 GameManager
const GameContext = createContext<GameManager | undefined>(undefined);

interface Props {
    children: ReactNode
}

export function SaveProvider(props: Props) {
    const { children } = props;
    const [gameManager] = useState(() => new GameManager());

    return (
        <GameContext.Provider value={gameManager}>
            {children}
        </GameContext.Provider>
    );
};

// 自定义 hook 用于访问 GameContext
export const useSaveManager = (): GameManager => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error("useGameManager must be used within a GameProvider");
    }
    return context;
};
