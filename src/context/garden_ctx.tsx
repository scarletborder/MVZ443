// 提供energy, money, 怪物波数, boss血条的数据记录
// GameContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { gameStateManager } from '../store/GameStateManager';

// 定义游戏状态的类型（不再包含energy和starShards）
interface GameState {
  money: number;
  wave: number; // progress,进度
  bossHealth: number; // progress, boss 血条
  isPaused: boolean;
  // 关卡
}

// 定义 Context 值的类型
interface GameContextValue extends GameState {
  // energy 相关方法 - 直接操作 GameStateManager
  getCurrentEnergy: () => number;
  updateEnergy: (amount: number, special?: (prev: number) => number) => void;
  setEnergy: (amount: number) => void;

  // starShards 相关方法 - 直接操作 GameStateManager
  getCurrentStarShards: () => number;
  updateStarShards: (amount: number) => void;

  // 其他状态方法
  updateMoney: (amount: number) => void;
  updateWave: (percent: number) => void;
  updateBossHealth: (amount: number) => void;
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
    money: 0,
    wave: 0,
    bossHealth: -1,
    isPaused: true
  });

  // 初始化游戏状态管理器（设置默认值）
  React.useEffect(() => {
    gameStateManager.updateEnergy(100);
    gameStateManager.updateStarShards(0);
  }, []);

  // Energy 相关方法 - 直接操作 GameStateManager
  function getCurrentEnergy(): number {
    return gameStateManager.getCurrentEnergy();
  }

  function updateEnergy(amount: number, special?: (prev: number) => number) {
    if (special) {
      const currentEnergy = gameStateManager.getCurrentEnergy();
      const newEnergy = Math.max(0, special(currentEnergy));
      gameStateManager.updateEnergy(newEnergy);
    } else {
      const currentEnergy = gameStateManager.getCurrentEnergy();
      const newEnergy = Math.max(0, currentEnergy + amount);
      gameStateManager.updateEnergy(newEnergy);
    }
  }

  function setEnergy(amount: number) {
    gameStateManager.updateEnergy(amount);
  }

  // StarShards 相关方法 - 直接操作 GameStateManager
  function getCurrentStarShards(): number {
    return gameStateManager.getCurrentStarShards();
  }

  function updateStarShards(amount: number) {
    const currentStarShards = gameStateManager.getCurrentStarShards();
    const newStarShards = Math.min(5, Math.max(0, currentStarShards + amount));
    gameStateManager.updateStarShards(newStarShards);
  }

  // 其他状态方法
  function updateMoney(amount: number) {
    setGameState(prev => ({
      ...prev,
      money: Math.max(0, prev.money + amount)
    }));
  }

  // 强制赋值
  function updateWave(percent: number) {
    setGameState(prev => ({
      ...prev,
      wave: percent
    }));
  }

  function updateBossHealth(amount: number) {
    setGameState(prev => ({
      ...prev,
      bossHealth: Math.max(0, prev.bossHealth + amount)
    }));
  }

  function setIsPaused(isPaused: boolean) {
    setGameState(prev => ({
      ...prev,
      isPaused
    }));
  }

  const contextValue: GameContextValue = {
    ...gameState,
    getCurrentEnergy,
    updateEnergy,
    setEnergy,
    getCurrentStarShards,
    updateStarShards,
    updateMoney,
    updateWave: updateWave,
    updateBossHealth,
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