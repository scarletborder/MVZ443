// BottomTools.jsx
import { useGameContext } from "../context/garden_ctx";
import { useCallback, useEffect, useState } from "react";
import { EventBus } from "../game/EventBus";
import { useSettings } from "../context/settings_ctx";
import { StageDataRecords } from "../game/utils/loader";
import { publicUrl } from "../utils/browser";

type Props = {
    width: number
    chapterID: number | null
}

export default function BottomTools({ width, chapterID }: Props) {
    const gamectx = useGameContext();
    const { isBluePrint } = useSettings();
    const starUri = `${publicUrl}/assets/sprite/star.png`;

    useEffect(() => {
        const handleProgress = (data: { progress: number }) => {
            gamectx.updateWave(data.progress);
        }
        EventBus.on('game-progress', handleProgress);

        return () => {
            EventBus.removeListener('game-progress', handleProgress);
        }
    }, [isBluePrint, gamectx.updateWave])

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
        (gamectx.bossHealth / 100) * 100 :
        (gamectx.wave / 100) * 100;

    return (
        <div className="bottom" style={{
            width: width,
            height: width / 32,
        }}>
            <div className="money">{gamectx.money} $</div>
            <div className={`stars ${gamectx.isPaused ? 'paused' : ''}`} onClick={handleStarClick}>
                {Array.from({ length: gamectx.starShareds }).map((_, index) => (
                    <img
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
