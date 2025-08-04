import React from 'react';
import { OnlineStateManager } from '../store/OnlineStateManager';
import BackendWS from '../utils/net/sync';
import EnumGameStage from '../utils/net/game_state';

interface OnlineStatusProps {
  gameStage?: number;
  playerCount?: number;
}

const OnlineStatus: React.FC<OnlineStatusProps> = ({ gameStage, playerCount }) => {
  const onlineManager = OnlineStateManager.getInstance();
  const isOnlineMode = BackendWS.isOnlineMode();
  const islord = BackendWS.isLord();

  if (!isOnlineMode) {
    return null;
  }

  const currentGameStage = gameStage ?? onlineManager.getCurrentGameStage();
  const currentPlayerCount = playerCount ?? onlineManager.getPlayerCount();

  const getStageText = (stage: number) => {
    switch (stage) {
      case EnumGameStage.InLobby: return '大厅';
      case EnumGameStage.Preparing: return '准备中';
      case EnumGameStage.Loading: return '加载中';
      case EnumGameStage.InGame: return '游戏中';
      case EnumGameStage.PostGame: return '结算';
      default: return '未知';
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 1000,
      pointerEvents: 'none' // 确保不会阻挡其他元素的点击
    }}>
      {islord ? '房主' : '玩家'} | 阶段: {getStageText(currentGameStage)} | 玩家: {currentPlayerCount}
    </div>
  );
};

export default OnlineStatus;
