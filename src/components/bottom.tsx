// BottomTools.jsx
import { useGameContext } from "../context/garden_ctx";
import { useCallback, useEffect, useState } from "react";
import { EventBus } from "../game/EventBus";
import { useSettings } from "../context/settings_ctx";
import { StageDataRecords } from "../game/utils/loader";
import { publicUrl } from "../utils/browser";
import { useSaveManager } from "../context/save_ctx";

type Props = {
    width: number
    chapterID: number | null
}

export default function BottomTools({ width, chapterID }: Props) {
    const gamectx = useGameContext();
    const savectx = useSaveManager();
    const { isBluePrint } = useSettings();
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
            gamectx.updateStarShards(-1);
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

    // 计算进度条百分比
    const progress = gamectx.bossHealth !== -1 ?
        (bossHealth) :
        (gamectx.wave / 100) * 100;

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
                gamectx.bossHealth !== -1 ? (
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
            <div className='stageDisplay' onClick={handleSetPause}>{chapterID ? StageDataRecords[chapterID].name : 'loading'}</div>
        </div >
    );
}
