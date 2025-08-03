// BottomTools.jsx
import { useGameContext } from "../../context/garden_ctx";
import { useEffect, useState } from "react";
import { EventBus } from "../../game/EventBus";
import { StageDataRecords } from "../../game/utils/loader";
import { publicUrl } from "../../utils/browser";
import { useSaveManager } from "../../context/save_ctx";
import BackendWS from "../../utils/net/sync";
import { useLocaleMessages } from "../../hooks/useLocaleMessages";
import { gameStateManager } from "../../store/GameStateManager";
import { useMemoizedFn, useLatest } from "ahooks";

type Props = {
    width: number
    chapterID: number | null
}

export default function BottomTools({ width, chapterID }: Props) {
    const gamectx = useGameContext();
    const savectx = useSaveManager();
    const { translate } = useLocaleMessages();
    const starUri = `${publicUrl}/assets/sprite/star.png`;

    const [bossHealth, setBossHealth] = useState<number>(-1);
    const [starShards, setStarShards] = useState(gameStateManager.getCurrentStarShards()); // 从 GameStateManager 获取星之碎片

    // 监听星之碎片变化
    useEffect(() => {
        const handleStarShardsUpdate = (newStarShards: number) => {
            setStarShards(newStarShards);
        };

        gameStateManager.onStarShardsUpdate(handleStarShardsUpdate);

        // 设置初始值
        setStarShards(gameStateManager.getCurrentStarShards());

        return () => {
            gameStateManager.removeStarShardsUpdateListener(handleStarShardsUpdate);
        };
    }, []);

    // 使用 useMemoizedFn 优化事件处理函数
    const handleProgress = useMemoizedFn((data: { progress: number }) => {
        gamectx.updateWave(data.progress);
    });

    useEffect(() => {
        EventBus.on('game-progress', handleProgress);

        return () => {
            EventBus.removeListener('game-progress', handleProgress);
        }
    }, [handleProgress]);

    const handleBossHealth = useMemoizedFn((data: { health: number }) => {
        gamectx.updateBossHealth(data.health);
        setBossHealth(data.health);
    });

    const handleBossDead = useMemoizedFn(() => {
        gamectx.updateBossHealth(-1);
        setBossHealth(-1);
    });

    useEffect(() => {
        // boss health 实际上是百分比[0,100]
        EventBus.on('boss-dead', handleBossDead);
        EventBus.on('boss-health', handleBossHealth);
        return () => {
            EventBus.removeListener('boss-health', handleBossHealth);
            EventBus.removeListener('boss-dead', handleBossDead);
        }
    }, [handleBossHealth, handleBossDead]);

    const handleStarShardsConsume = useMemoizedFn(() => {
        if (BackendWS.isOnlineMode) {
            gamectx.updateStarShards(-2);
        } else {
            gamectx.updateStarShards(-1);
        }
    });

    const handleStarShardsGet = useMemoizedFn(() => {
        gamectx.updateStarShards(1);
    });

    useEffect(() => {
        EventBus.on('starshards-consume', handleStarShardsConsume);
        EventBus.on('starshards-get', handleStarShardsGet);
        return () => {
            EventBus.removeListener('starshards-consume', handleStarShardsConsume);
            EventBus.removeListener('starshards-get', handleStarShardsGet);
        }
    }, [handleStarShardsConsume, handleStarShardsGet]);

    const handleStarClick = useMemoizedFn(() => {
        EventBus.emit('card-deselected', { pid: null }); // 通知卡片取消选中
        if (gamectx.isPaused) return;
        if (starShards <= 0) return;
        EventBus.emit('starshards-click');
    });

    const gamectxLatest = useLatest(gamectx);

    const handleSetPause = useMemoizedFn(() => {
        const newPaused = !gamectxLatest.current?.isPaused;
        EventBus.emit('setIsPaused', { paused: newPaused });
    });

    useEffect(() => {
        EventBus.on('okIsPaused', (data: { paused: boolean }) => {
            gamectx.setIsPaused(data.paused);
        });
        return () => {
            EventBus.removeListener('okIsPaused');
        }
    }, []); // 不要改

    // 优化键盘事件处理
    const handleKeyPress = useMemoizedFn((event: { key: string; }) => {
        if (event.key === 'w' || event.key === 'W') { // 支持小写和大写 "w"
            handleStarClick(); // 按下 w 键时调用 handleStarClick
        }
    });

    // 添加键盘事件监听
    useEffect(() => {
        // 绑定键盘事件
        window.addEventListener('keydown', handleKeyPress);

        // 清理函数，在组件卸载时移除事件监听器
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [handleKeyPress]); // 依赖于 memoized 函数


    // 计算进度条百分比
    const progress = bossHealth > 0 ?
        (bossHealth) :
        (gamectx.wave);

    return (
        <div className="bottom" style={{
            width: width,
            height: width / 32,
        }}>
            <div className="money">{savectx.currentProgress.items.get(1) ? savectx.currentProgress.items.get(1)?.count : '0'} $</div>
            <div className={`stars ${gamectx.isPaused ? 'paused' : ''}`} onClick={handleStarClick}>
                {Array.from({ length: starShards }).map((_, index) => (
                    <img
                        draggable={false}
                        key={index}
                        src={starUri}
                    />
                ))}
            </div>


            {
                bossHealth > 0 ? (
                    <div className="boss-health">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                ) : (
                    <div className="wave">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                )
            }
            <div className='stageDisplay' onClick={handleSetPause}>{chapterID ? translate(StageDataRecords[chapterID].nameKey) : 'loading'}</div>
        </div >
    );
}
