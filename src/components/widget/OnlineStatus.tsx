import React, { useState, useEffect } from 'react';
import { OnlineStateManager } from '../../store/OnlineStateManager';
import BackendWS from '../../utils/net/sync';
import EnumGameStage from '../../utils/net/game_state';
import {
  PhaserEventBus,
  PhaserEvents,
} from '../../game/EventBus';

interface OnlineStatusProps {
  isInGame?: boolean; // 是否在游戏场景中
  position?: 'top-right' | 'bottom-right';
}

const OnlineStatus: React.FC<OnlineStatusProps> = ({
  isInGame = false,
  position = 'top-right'
}) => {
  const [isOnline, setIsOnline] = useState(false);
  const [gameStage, setGameStage] = useState(EnumGameStage.InLobby);
  const [roomInfo, setRoomInfo] = useState({
    roomId: 0,
    myId: 0,
    lordId: 0,
    playerCount: 0
  });
  const [readyCount, setReadyCount] = useState({ ready: 0, total: 0 });

  useEffect(() => {
    const onlineManager = OnlineStateManager.getInstance();

    // 初始化状态
    setIsOnline(BackendWS.isOnlineMode());
    setGameStage(onlineManager.getCurrentGameStage());

    const roomInfoData = onlineManager.getRoomInfo();
    setRoomInfo({
      roomId: roomInfoData.roomId,
      myId: roomInfoData.myId,
      lordId: roomInfoData.lordId,
      playerCount: onlineManager.getPlayerCount()
    });

    // 监听在线状态变化
    const handleOnlineModeChange = (online: boolean) => {
      setIsOnline(online);
    };

    // 监听游戏阶段变化
    const handleGameStageChange = (stage: number) => {
      setGameStage(stage);
    };

    // 监听房间信息变化
    const handleRoomInfoChange = () => {
      const roomInfoData = onlineManager.getRoomInfo();
      setRoomInfo({
        roomId: roomInfoData.roomId,
        myId: roomInfoData.myId,
        lordId: roomInfoData.lordId,
        playerCount: onlineManager.getPlayerCount()
      });
    };

    // 监听准备状态更新
    const handleReadyCountUpdate = (event: { readyCount: number; totalPlayers: number }) => {
      setReadyCount({ ready: event.readyCount, total: event.totalPlayers });
    };

    // 注册监听器
    onlineManager.onOnlineModeUpdate(handleOnlineModeChange);
    onlineManager.onGameStageUpdate(handleGameStageChange);
    onlineManager.onRoomInfoUpdate(handleRoomInfoChange);
    PhaserEventBus.on(PhaserEvents.RoomUpdateReadyCount, handleReadyCountUpdate);

    return () => {
      onlineManager.removeOnlineModeUpdateListener(handleOnlineModeChange);
      onlineManager.removeGameStageUpdateListener(handleGameStageChange);
      onlineManager.removeRoomInfoUpdateListener(handleRoomInfoChange);
      PhaserEventBus.off(PhaserEvents.RoomUpdateReadyCount, handleReadyCountUpdate);
    };
  }, []);

  // 如果不在线，不显示
  if (!isOnline) {
    return null;
  }

  const getStageText = (stage: number) => {
    switch (stage) {
      case EnumGameStage.InLobby:
        return '大厅';
      case EnumGameStage.Preparing:
        return '准备中';
      case EnumGameStage.Loading:
        return '加载中';
      case EnumGameStage.InGame:
        return '游戏中';
      case EnumGameStage.PostGame:
        return '结算';
      default:
        return '未知';
    }
  };

  const getPositionStyle = () => {
    const baseStyle = {
      position: 'fixed' as const,
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: isInGame ? '4px 8px' : '8px 12px',
      borderRadius: '4px',
      fontSize: isInGame ? '10px' : '12px',
      fontWeight: 'bold' as const,
      zIndex: 9999,
      backdropFilter: 'blur(5px)',
      border: '1px solid rgba(0, 200, 255, 0.3)',
    };

    switch (position) {
      case 'top-right':
        return {
          ...baseStyle,
          top: '10px',
          right: '10px',
        };
      case 'bottom-right':
        return {
          ...baseStyle,
          bottom: '10px',
          right: '10px',
        };
      default:
        return baseStyle;
    }
  };

  const isLord = roomInfo.myId === roomInfo.lordId;
  const stageText = getStageText(gameStage);

  return (
    <div style={getPositionStyle()}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ color: '#00ccff' }}>
          {isLord ? '🔷房主' : '🔸玩家'} | {stageText}
        </div>
        {!isInGame && (
          <>
            <div style={{ fontSize: isInGame ? '8px' : '10px', color: '#ccc' }}>
              房间: {roomInfo.roomId} | 玩家: {roomInfo.playerCount}
            </div>
            {gameStage === EnumGameStage.Preparing && readyCount.total > 0 && (
              <div style={{ fontSize: isInGame ? '8px' : '10px', color: '#ffcc00' }}>
                准备: {readyCount.ready}/{readyCount.total}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OnlineStatus;
