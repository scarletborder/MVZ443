// BottomTools.jsx
import { useGameContext } from "../context/garden_ctx";
import "../../public/bottom.css";
import { useEffect, useState } from "react";
import { EventBus } from "../game/EventBus";

export default function BottomTools() {
    const { money, wave, bossHealth, starShareds, updateWave } = useGameContext();

    const [starStr, setStarStr] = useState<string>('*');
    const [starChosen, setStarChosen] = useState<boolean>(false);

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
        EventBus.on('game-progress', handleProgress);
        EventBus.on('game-over', handleGameOver);

        return () => {
            EventBus.removeListener('game-progress', handleProgress);
            EventBus.removeListener('game-over', handleGameOver);
        }
    }, [])

    const handleStarClick = () => {
        setStarChosen(stat => !stat);
    };

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
            <button className="pause">Pause</button>
        </div >
    );
}
