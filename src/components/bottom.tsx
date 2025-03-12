// BottomTools.jsx
import { useGameContext } from "../context/garden_ctx";
import { useCallback, useEffect, useState } from "react";
import { EventBus } from "../game/EventBus";
import { useSettings } from "../context/settings_ctx";
import { StageDataRecords } from "../game/utils/loader";

type Props = {
    width: number
    chapterID: number | null
}

export default function BottomTools({ width, chapterID }: Props) {
    const { money, wave, bossHealth, starShareds, updateWave, isPaused, setIsPaused } = useGameContext();

    const [starStr, setStarStr] = useState<string>('*');
    const [starChosen, setStarChosen] = useState<boolean>(false);
    const { isBluePrint } = useSettings();


    useEffect(() => {
        const handleProgress = (data: { progress: number }) => {
            updateWave(data.progress);
        }

        EventBus.on('game-progress', handleProgress);

        return () => {
            EventBus.removeListener('game-progress', handleProgress);
        }
    }, [isBluePrint, updateWave])

    const handleStarClick = () => {
        setStarChosen(stat => !stat);
        EventBus.emit('starShards-chosen');
    };

    const handleSetPause = useCallback(() => {
        const newPaused = !isPaused;
        EventBus.emit('setIsPaused', { paused: newPaused });
    }, [isPaused]);

    useEffect(() => {
        EventBus.on('okIsPaused', (data: { paused: boolean }) => {
            setIsPaused(data.paused);
        });
        return () => {
            EventBus.removeListener('okIsPaused');
        }
    }, []); // 不要改

    useEffect(() => {
        let tmp = 'star';
        for (let i = 0; i < starShareds; ++i) {
            tmp += '* ';
        }
        setStarStr(tmp);
    }, [starShareds]);

    // 计算进度条百分比
    const progress = bossHealth !== -1 ?
        (bossHealth / 100) * 100 :
        (wave / 100) * 100;

    return (
        <div className="bottom" style={{
            width: width,
            height: width / 32,
        }}>
            <div className="money">{money} $</div>
            <div className={`stars${starChosen ? ' chosen' : ''}`} onClick={handleStarClick}>{starStr}</div>
            <div style={{ 'width': '15%' }}></div>

            {
                bossHealth !== -1 ? (
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
