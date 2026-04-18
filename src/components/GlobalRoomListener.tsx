import React, { useEffect } from 'react';
import {
  PhaserEventBus,
  PhaserEvents,
} from '../game/EventBus';

interface GlobalRoomListenerProps {
  setCurrentView: (view: string) => void;
  setSkipToParams: (skip: boolean) => void;
  setChosenStage: (stage: number | null) => void;
}

const GlobalRoomListener: React.FC<GlobalRoomListenerProps> = ({
  setCurrentView,
  setSkipToParams,
  setChosenStage
}) => {
  useEffect(() => {
    const handleRoomChooseMap = (event: any) => {
      // 房主选择了地图，所有用户都需要跳转到选卡界面
      const { stageId } = event;
      if (stageId && stageId > 0) {
        console.log('收到选图消息，跳转到选卡界面:', stageId);
        setChosenStage(stageId);
        setSkipToParams(true);
        setCurrentView('levels');
      }
    };

    // 监听房间选图事件
    PhaserEventBus.on(PhaserEvents.RoomChooseMap, handleRoomChooseMap);

    return () => {
      PhaserEventBus.off(PhaserEvents.RoomChooseMap, handleRoomChooseMap);
    };
  }, [setCurrentView, setSkipToParams, setChosenStage]);

  return null; // 这个组件不渲染任何内容
};

export default GlobalRoomListener;
