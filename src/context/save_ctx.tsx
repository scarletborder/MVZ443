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

interface GameProgress {
    level: Set<number>;
    plants: Plant[];
    zombies: Zombie[];
    items: Map<number, Item>;
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
            const gameProgress: GameProgress = JSON.parse(jsonString);
            this.saveGameProgress(gameProgress);
            return gameProgress
        } catch (error) {
            console.error("导入存档失败: ", error);
        }
    }
}


class GameManager {
    saveManager: SaveManager;
    currentProgress: GameProgress;

    constructor() {
        this.saveManager = new SaveManager();
        this.currentProgress = {
            level: new Set([1]),
            plants: [{ pid: 1, level: 1 }, { pid: 2, level: 1 }],
            zombies: [],
            items: new Map<number, Item>()
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

    // 保存当前游戏进度
    saveProgress(): void {
        this.saveManager.saveGameProgress(this.currentProgress);
    }

    // 加载当前游戏进度 (确保更更新的记录覆盖现有记录)
    loadProgress(callback?: () => void): void {
        this.saveManager.loadGameProgress((gameProgress) => {
            if (gameProgress) {
                // 只覆盖更新的部分
                this.currentProgress.level = new Set([...gameProgress.level]);
                this.currentProgress.plants = [...gameProgress.plants];
                this.currentProgress.zombies = [...gameProgress.zombies];
                this.currentProgress.items = new Map([...gameProgress.items]);

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
        let jsonStr = JSON.stringify(this.currentProgress);
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
