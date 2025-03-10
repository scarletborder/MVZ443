// BottomTools.jsx
import { useGameContext } from "../context/garden_ctx";
import "../../public/bottom.css";
import { useCallback, useEffect, useState } from "react";
import { EventBus } from "../game/EventBus";
import { useSettings } from "../context/settings_ctx";

export default function BottomTools() {
    const { money, wave, bossHealth, starShareds, updateWave, isPaused, setIsPaused } = useGameContext();

    const [starStr, setStarStr] = useState<string>('*');
    const [starChosen, setStarChosen] = useState<boolean>(false);
    const { isBluePrint } = useSettings();


    useEffect(() => {
        const handleProgress = (data: { progress: number }) => {
            updateWave(data.progress);
        }
        const handleGameOver = (data: { win: boolean }) => {
            if (data.win) {
                alert('You Win!');
            } else {
                alert('You Lose!');
            }
        }
        const handleSceneReady = (data: { scene: Phaser.Scene }) => {
            EventBus.emit("send-game-settings", {
                isBluePrint
            });
        };
        EventBus.on('game-progress', handleProgress);
        EventBus.on('game-over', handleGameOver);
        EventBus.on('current-scene-ready', handleSceneReady);

        return () => {
            EventBus.removeListener('game-progress', handleProgress);
            EventBus.removeListener('game-over', handleGameOver);
            EventBus.removeListener('current-scene-ready', handleSceneReady);
        }
    }, [])

    const handleStarClick = () => {
        setStarChosen(stat => !stat);
        EventBus.emit('starShards-chosen');
    };

    const handleSetPause = useCallback(() => {
        let newPaused = !isPaused;
        EventBus.emit('setIsPaused', { paused: newPaused });
    }, [isPaused]);

    useEffect(() => {
        EventBus.on('okIsPaused', (data: { paused: boolean }) => {
            setIsPaused(data.paused);
        });
        return () => {
            EventBus.removeListener('okIsPaused');
        }
    }, []);

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
        <div className="bottom">
            <div className="money">{money} $</div>
            <div className={`stars${starChosen ? ' chosen' : ''}`} onClick={handleStarClick}>{starStr}</div>
            <div style={{ 'width': '30%' }}></div>

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
            <div className='stageDisplay' onClick={handleSetPause}>测试关卡第一关</div>
        </div >
    );
}
