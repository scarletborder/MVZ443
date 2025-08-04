import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EventBus } from '../game/EventBus';
import { OnlineStateManager } from '../store/OnlineStateManager';
import EnumGameStage from '../utils/net/game_state';
import { publicUrl } from '../utils/browser';

/**
 * 全局在线状态监听器
 * 处理在线游戏状态变化时的页面跳转
 */
const GlobalOnlineStateListener: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const onlineManager = OnlineStateManager.getInstance();

  useEffect(() => {
    // 监听房主选择地图事件
    const handleRoomChooseMap = (event: any) => {
      const myId = onlineManager.getRoomInfo().myId;
      const lordId = onlineManager.getRoomInfo().lordId;

      // 如果不是房主，需要跳转到主页并进入选卡界面
      if (myId !== lordId) {
        console.log('🎮 非房主收到选图消息，从', location.pathname, '跳转到主页选卡界面');
        
        // 如果不在主页，先跳转到主页，并通过URL参数传递选图信息
        if (location.pathname !== `${publicUrl}/`) {
          const { stageId } = event;
          // 通过URL参数传递选图信息，确保DocFrame能接收到
          navigate(`${publicUrl}/?autoSelectStage=${stageId}&fromPage=${encodeURIComponent(location.pathname)}`);
        }
      }
    };

    // 监听游戏阶段变化
    const handleGameStageChange = (gameStage: number) => {
      console.log('🎮 全局监听到游戏阶段变化:', gameStage, '当前页面:', location.pathname);
      
      // 如果进入准备阶段且不在主页，跳转到主页
      if (gameStage === EnumGameStage.Preparing && location.pathname !== `${publicUrl}/`) {
        console.log('🎮 进入准备阶段，从', location.pathname, '跳转到主页');
        navigate(`${publicUrl}/`);
      }
      
      // 如果游戏开始且不在主页，跳转到主页
      if (gameStage === EnumGameStage.InGame && location.pathname !== `${publicUrl}/`) {
        console.log('🎮 游戏开始，从', location.pathname, '跳转到主页');
        navigate(`${publicUrl}/`);
      }
    };

    // 监听所有玩家准备就绪事件
    const handleRoomAllReady = () => {
      console.log('🎮 所有玩家准备就绪，确保在主页');
      if (location.pathname !== `${publicUrl}/`) {
        navigate(`${publicUrl}/`);
      }
    };

    // 注册事件监听器
    EventBus.on('room-choose-map', handleRoomChooseMap);
    EventBus.on('room-all-ready', handleRoomAllReady);
    onlineManager.onGameStageUpdate(handleGameStageChange);

    return () => {
      EventBus.off('room-choose-map', handleRoomChooseMap);
      EventBus.off('room-all-ready', handleRoomAllReady);
      onlineManager.removeGameStageUpdateListener(handleGameStageChange);
    };
  }, [navigate, location.pathname]);

  return null; // 这个组件不渲染任何内容
};

export default GlobalOnlineStateListener;
