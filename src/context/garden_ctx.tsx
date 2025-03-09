// 提供energy, money, 怪物波数, boss血条的数据记录
// GameContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

// 定义游戏状态的类型
interface GameState {
    energy: number;
    money: number;
    wave: number;
    bossHealth: number;
    starShareds: number;
    isPaused: boolean;
}

// 定义 Context 值的类型
interface GameContextValue extends GameState {
    updateEnergy: (amount: number) => void;
    updateMoney: (amount: number) => void;
    updateWave: (percent: number) => void;
    updateBossHealth: (amount: number) => void;
    updateStarShards: (amouunt: number) => void;
    setIsPaused: (isPaused: boolean) => void;
}

// 创建 Context
const GameContext = createContext<GameContextValue | undefined>(undefined);

// Provider 的 props 类型
interface GameProviderProps {
    children: ReactNode;
}

// Context Provider 组件 - 使用 function 声明
export function GameProvider(props: GameProviderProps) {
    const { children } = props;
    const [gameState, setGameState] = useState<GameState>({
        energy: 100,
        money: 0,
        wave: 0,
        bossHealth: -1,
        starShareds: 0,
        isPaused: false
    });

    function updateEnergy(amount: number) {
        setGameState(prev => ({
            ...prev,
            energy: Math.max(0, prev.energy + amount)
        }));
    }

    function updateMoney(amount: number) {
        setGameState(prev => ({
            ...prev,
            money: Math.max(0, prev.money + amount)
        }));
    }

    function updateWave(percent: number) {
        setGameState(prev => ({
            ...prev,
            wave: prev.wave + percent
        }));
    }

    function updateBossHealth(amount: number) {
        setGameState(prev => ({
            ...prev,
            bossHealth: Math.max(0, prev.bossHealth + amount)
        }));
    }

    function updateStarShards(amount: number) {
        setGameState(prev => ({
            ...prev,
            starShareds: prev.starShareds + amount
        }))
    }

    function setIsPaused(isPaused: boolean) {
        setGameState(prev => ({
            ...prev,
            isPaused
        }));
    }

    const contextValue: GameContextValue = {
        ...gameState,
        updateEnergy,
        updateMoney,
        updateWave: updateWave,
        updateBossHealth,
        updateStarShards,
        setIsPaused
    };

    return (
        <GameContext.Provider value={contextValue} >
            {children}
        </GameContext.Provider>
    );
}

// 自定义 hook
export function useGameContext(): GameContextValue {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGameContext must be used within a GameProvider');
    }
    return context;
}