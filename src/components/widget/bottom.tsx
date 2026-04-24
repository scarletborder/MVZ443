// BottomTools.jsx
import { useEffect, useRef, useState } from "react";
import {
  PhaserEventBus,
  PhaserEvents,
} from "../../game/EventBus";
import { StageDataRecords } from "../../game/utils/loader";
import { publicUrl } from "../../utils/browser";
import { useSaveManager } from "../../context/save_ctx";
import BackendWS from "../../utils/net/sync";
import { useLocaleMessages } from "../../hooks/useLocaleMessages";
import { commonKey, stageKey } from "../../i18n/keys";
import { useMemoizedFn } from "ahooks";
import OnlineStatus from "../OnlineStatus";
import CardpileManager from "../../game/managers/combat/CardpileManager";
import MobManager, { ProgressMode, ProgressUpdateEvent } from "../../game/managers/combat/MobManager";
import ResourceManager from "../../game/managers/combat/ResourceManager";
import PlantsManager from "../../game/managers/combat/PlantsManager";

type Props = {
  width: number
  chapterID: number | null
}

export default function BottomTools({ width, chapterID }: Props) {
  const savectx = useSaveManager();
  const { translate } = useLocaleMessages();
  const starUri = `${publicUrl}/assets/sprite/star.png`;

  const [progressState, setProgressState] = useState<ProgressUpdateEvent>({
    mode: ProgressMode.Normal,
    totalWaves: 99,
    currentWave: 0,
    flagWaves: [],
  });

  const [starShards, setStarShards] = useState<number>(0);
  const [starshardsInsufficientFlash, setStarshardsInsufficientFlash] = useState(false);
  const flashTimeoutRef = useRef<number | null>(null);

  // 监听星之碎片变化
  useEffect(() => {
    const offListen = ResourceManager.Instance.Eventbus.on('onStarShardsUpdate', (newStarShards: number, playerId: number) => {
      if (playerId === ResourceManager.Instance.mineId) {
        setStarShards(newStarShards);
      }
    });


    return () => {
      offListen();
    };
  }, []);

  const triggerStarshardsInsufficientFlash = useMemoizedFn(() => {
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
    }

    setStarshardsInsufficientFlash(false);
    window.requestAnimationFrame(() => {
      setStarshardsInsufficientFlash(true);
    });

    flashTimeoutRef.current = window.setTimeout(() => {
      setStarshardsInsufficientFlash(false);
      flashTimeoutRef.current = null;
    }, 450);
  });

  useEffect(() => {
    const offListen = PlantsManager.Instance.EventBus.on('onStarshardsInsufficient', () => {
      triggerStarshardsInsufficientFlash();
    });

    return () => {
      offListen();
      if (flashTimeoutRef.current !== null) {
        window.clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const offProgressUpdate = MobManager.Instance.EventBus.on('onProgressUpdate', (progress) => {
      setProgressState(progress);
    });

    const handleBossHealth = ({ health }: { health: number }) => {
      if (health < 0) {
        return;
      }
      setProgressState({
        mode: ProgressMode.Boss,
        bossHealthPercent: Math.max(0, Math.min(1, health / 100)),
      });
    };

    const handleBossDead = () => {
      setProgressState(prev => {
        if (prev.mode !== ProgressMode.Boss) {
          return prev;
        }
        return {
          mode: ProgressMode.Boss,
          bossHealthPercent: 0,
        };
      });
    };

    PhaserEventBus.on(PhaserEvents.BossHealth, handleBossHealth);
    PhaserEventBus.on(PhaserEvents.BossDead, handleBossDead);

    return () => {
      offProgressUpdate();
      PhaserEventBus.off(PhaserEvents.BossHealth, handleBossHealth);
      PhaserEventBus.off(PhaserEvents.BossDead, handleBossDead);
    };
  }, [setProgressState]);

  const handleStarClick = useMemoizedFn(() => {
    if (starShards <= 0) {
      PlantsManager.Instance.EventBus.emit('onStarshardsInsufficient');
      return;
    }
    CardpileManager.Instance.ClickStarShards();
  });

  const handleSetPause = useMemoizedFn(() => {
    if (BackendWS.isOnlineMode()) {
      return;
    }
    PhaserEventBus.emit(PhaserEvents.TogglePause);
  });

  const ProgressBarComponent = () => {
    if (progressState.mode === ProgressMode.Boss) {
      const progress = (progressState.bossHealthPercent || 0) * 100;
      return (
        <div className="boss-health">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%`, backgroundColor: 'red' }}
            ></div>
          </div>
        </div>
      );
    }

    // Normal mode
    const { totalWaves, currentWave, flagWaves } = progressState;

    let progress = 0;
    if (totalWaves > 1) {
      if (currentWave <= 0) progress = 0;
      else if (currentWave >= totalWaves) progress = 100;
      else progress = (currentWave / totalWaves) * 100;
    } else {
      progress = currentWave > 0 ? 100 : 0;
    }

    return (
      <div className="wave" style={{ position: 'relative' }}>
        <div className="progress-bar" style={{ position: 'relative' }}>
          <div
            className="progress-fill"
            style={{
              width: `${Math.max(0, Math.min(100, progress))}%`,
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0
            }}
          ></div>
          {/* 渲染旗帜分割线 */}
          {flagWaves && totalWaves > 1 && flagWaves.map((flagWaveId, idx) => {
            const flagPercent = (flagWaveId / (totalWaves - 1)) * 100;
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  right: `${flagPercent}%`,
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  backgroundColor: 'white', /* 也可以使用图片或者别的颜色体现旗帜 */
                  zIndex: 2,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bottom" style={{
      width: width,
      height: width / 32,
    }}>
      <div className="money">{savectx.currentProgress.items.get(1) ? savectx.currentProgress.items.get(1)?.count : '0'} $</div>
      <div className={`stars ${starshardsInsufficientFlash ? 'insufficient-flash' : ''}`} onClick={handleStarClick}>
        {Array.from({ length: starShards }).map((_, index) => (
          <img
            draggable={false}
            key={index}
            src={starUri}
          />
        ))}
      </div>

      <ProgressBarComponent />

      <div className='stageDisplay' onClick={handleSetPause}>
        {chapterID ? translate(stageKey(StageDataRecords[chapterID].nameKey)) : translate(commonKey('loading'))}
      </div>

      {/* 在游戏场景中显示在线状态，替换暂停按钮区域 */}
      {BackendWS.isOnlineMode() && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          zIndex: 1000
        }}>
          <OnlineStatus />
        </div>
      )}
    </div >
  );
}
