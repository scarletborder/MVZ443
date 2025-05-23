// BottomTools.jsx
import { useGameContext } from "../../context/garden_ctx";
import { useCallback, useEffect, useState } from "react";
import { EventBus } from "../../game/EventBus";
import { useSettings } from "../../context/settings_ctx";
import { StageDataRecords } from "../../game/utils/loader";
import { publicUrl } from "../../utils/browser";
import { useSaveManager } from "../../context/save_ctx";
import BackendWS from "../../utils/net/sync";
import { useLocaleMessages } from "../../hooks/useLocaleMessages";

type Props = {
    width: number
    chapterID: number | null
}

export default function BottomTools({ width, chapterID }: Props) {
    const gamectx = useGameContext();
    const savectx = useSaveManager();
    const { isBluePrint } = useSettings();
    const { translate } = useLocaleMessages();
    const starUri = `${publicUrl}/assets/sprite/star.png`;

    const [bossHealth, setBossHealth] = useState<number>(-1);

    useEffect(() => {
        const handleProgress = (data: { progress: number }) => {
            gamectx.updateWave(data.progress);
        }
        EventBus.on('game-progress', handleProgress);

        return () => {
            EventBus.removeListener('game-progress', handleProgress);
        }
    }, [isBluePrint, gamectx.updateWave]);

    useEffect(() => {
        // boss health 实际上是百分比[0,100]
        const handleBossHealth = (data: { health: number }) => {
            gamectx.updateBossHealth(data.health);
            setBossHealth(data.health);
        }
        const handleBossDead = () => {
            gamectx.updateBossHealth(-1);
            setBossHealth(-1);
        }
        EventBus.on('boss-dead', handleBossDead);
        EventBus.on('boss-health', handleBossHealth);
        return () => {
            EventBus.removeListener('boss-health', handleBossHealth);
            EventBus.removeListener('boss-dead', handleBossDead);
        }
    }, [isBluePrint, gamectx.updateBossHealth])

    useEffect(() => {
        const handleStarShardsConsume = () => {
            if (BackendWS.isConnected) {
                gamectx.updateStarShards(-2);
            } else {
                gamectx.updateStarShards(-1);
            }
        };
        const handleStarShardsGet = () => {
            gamectx.updateStarShards(1);
        };

        EventBus.on('starshards-consume', handleStarShardsConsume);
        EventBus.on('starshards-get', handleStarShardsGet);
        return () => {
            EventBus.removeListener('starshards-consume', handleStarShardsConsume);
            EventBus.removeListener('starshards-get', handleStarShardsGet);
        }
    }, [gamectx.updateStarShards])



    const handleStarClick = () => {
        EventBus.emit('card-deselected', { pid: null }); // 通知卡片取消选中
        if (gamectx.isPaused) return;
        if (gamectx.starShareds <= 0) return;
        EventBus.emit('starshards-click');
    };

    const handleSetPause = useCallback(() => {
        const newPaused = !gamectx.isPaused;
        EventBus.emit('setIsPaused', { paused: newPaused });
    }, [gamectx.isPaused]);

    useEffect(() => {
        EventBus.on('okIsPaused', (data: { paused: boolean }) => {
            gamectx.setIsPaused(data.paused);
        });
        return () => {
            EventBus.removeListener('okIsPaused');
        }
    }, []); // 不要改

    // 添加键盘事件监听
    useEffect(() => {
        const handleKeyPress = (event: { key: string; }) => {
            if (event.key === 'w' || event.key === 'W') { // 支持小写和大写 "q"
                handleStarClick(); // 按下 q 键时调用 handleClick
            }
        };

        // 绑定键盘事件
        window.addEventListener('keydown', handleKeyPress);

        // 清理函数，在组件卸载时移除事件监听器
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [handleStarClick]); // 依赖项，确保相关状态变化时重新绑定


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
                {Array.from({ length: gamectx.starShareds }).map((_, index) => (
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
