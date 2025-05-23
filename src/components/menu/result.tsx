import { useEffect, useRef, useState } from 'react';
import { useSaveManager } from '../../context/save_ctx';
import { OnWin, ProgressReward } from '../../game/models/IRecord';
import { ChapterDataRecords, StageDataRecords } from '../../game/utils/loader';
import PlantFactoryMap from '../../game/presets/plant';
import Stuff from '../../constants/stuffs';
import { useGameContext } from '../../context/garden_ctx';
import { useLocaleMessages } from '../../hooks/useLocaleMessages';

interface Props {
    width: number;
    height: number;
    isWin: boolean;
    onWin?: OnWin; // 游戏胜利时的奖励数据
    progressRewards: ProgressReward[] | undefined;
    myProgress: number;
    onBack: () => void;
}

export default function GameResultView({ width, height, isWin, onWin, progressRewards, myProgress, onBack }: Props) {
    // console.log(onWin)
    const saveManager = useSaveManager();
    const { setIsPaused, isPaused } = useGameContext();
    const hasSavedRef = useRef(false);

    // 状态存储计算好的字符串显示
    const [unlockedLevelsStr, setUnlockedLevelsStr] = useState<string>("none");
    const [unlockedPlantsStr, setUnlockedPlantsStr] = useState<string>("none");

    const { translate } = useLocaleMessages();

    useEffect(() => {
        if (!isPaused) setIsPaused(true);
    }, [setIsPaused]);

    useEffect(() => {
        if (!hasSavedRef.current) {
            if (progressRewards === undefined) return; // 进度奖励未初始化
            console.log("保存进度奖励");
            hasSavedRef.current = true;

            if (isWin) {
                onWin?.unLockPlant.forEach(plant => {
                    saveManager.recordPlantEncounter(plant);
                });
                onWin?.unLock.forEach(level => {
                    saveManager.setCurrentLevel(level);
                });
            }

            progressRewards.forEach(reward => {
                if (myProgress >= reward.progress) {
                    saveManager.updateItemCount(reward.reward.type, reward.reward.count);
                }
            });
            saveManager.saveProgress();
        }
    }, [progressRewards, onWin, isWin]);

    // 使用 useEffect 计算解锁关卡和解锁器械的字符串，避免在 JSX 中进行计算
    useEffect(() => {
        if (onWin) {
            let levelsStr = "无";
            let plantsStr = "无";

            if (onWin.unLock && onWin.unLock.length > 0) {
                const computedLevels = onWin.unLock.map((cpid) => {
                    const stage = StageDataRecords[cpid];
                    const chapter = ChapterDataRecords[stage.chapterID];
                    return `${chapter.nameKey} - ${stage.nameKey}`;
                }).filter(item => item !== "");
                levelsStr = computedLevels.length > 0 ? computedLevels.join(" ") : "无";
            }

            if (onWin.unLockPlant && onWin.unLockPlant.length > 0) {
                const computedPlants = onWin.unLockPlant.map((pid) => {
                    return PlantFactoryMap[pid].nameKey;
                }).filter(item => item !== "");
                plantsStr = computedPlants.length > 0 ? computedPlants.join(" ") : "无";
            }
            setUnlockedLevelsStr(levelsStr);
            setUnlockedPlantsStr(plantsStr);
        }
    }, [onWin, saveManager.currentProgress]);

    return (
        <div style={{
            width: `${width}px`,
            height: `${height}px`,
            background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
            position: "relative",
            overflow: "hidden",
            border: "2px solid #444",
            boxShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
            animation: "frameFadeIn 0.5s ease-out"
        }}>
            {/* 返回主页按钮 */}
            <button
                style={{
                    position: "absolute",
                    top: "2%",
                    left: "2%",
                    zIndex: 1000,
                    padding: "8px 16px",
                    background: "none",
                    border: "2px solid #666",
                    color: "#ddd",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.borderColor = "#00ccff";
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.background = "none";
                    e.currentTarget.style.borderColor = "#666";
                }}
                onClick={onBack}
            >
                {translate('menu_back')}
            </button>

            {/* 左侧：游戏结果 */}
            <div style={{
                width: "40%",
                height: "100%",
                position: "absolute",
                left: 0,
                top: 0,
                background: "rgba(20, 20, 20, 0.85)",
                backdropFilter: "blur(5px)",
                overflowY: "auto",
                scrollbarWidth: "thin",
                scrollbarColor: "#666 #333",
                padding: "60px 20px 20px 20px",
                color: "#ddd"
            }}>
                <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
                    {translate('menu_endding_result')}
                </h2>
                {isWin ? (
                    <div>
                        <p style={{ fontSize: "18px", marginBottom: "10px" }}>{translate('menu_endding_win')}</p>
                        {onWin && (
                            <>
                                <p>{translate('menu_endding_unlocked_level')}: {unlockedLevelsStr}</p>
                                <p>{translate('menu_endding_unlocked_plants')}: {unlockedPlantsStr}</p>
                            </>
                        )}
                    </div>
                ) : (
                    <p style={{ fontSize: "18px" }}>{translate('menu_endding_fail')}</p>
                )}
            </div>

            {/* 右侧：进度奖励 */}
            <div style={{
                width: "50%",
                height: "100%",
                position: "absolute",
                right: 0,
                top: 0,
                padding: "60px 20px 20px 20px",
                color: "#ddd",
                overflowY: "auto",
                scrollbarWidth: "thin",
                scrollbarColor: "#666 #333",
                background: "rgba(30, 30, 30, 0.9)"
            }}>
                <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
                    {`${translate('menu_endding_progress')}${translate('menu_endding_reward')} : ${myProgress}%`}
                </h2>
                {(progressRewards !== undefined && progressRewards.length > 0) ? (
                    progressRewards.map((reward, index) => (
                        (myProgress >= reward.progress) &&
                        (<div key={index} style={{ marginBottom: "15px" }}>
                            <p>{translate('menu_endding_progress')}: {reward.progress}%</p>
                            <p>{translate('menu_endding_reward')}: {Stuff(reward.reward.type, translate)}: {reward.reward.count}</p>
                        </div>)
                    ))
                ) : (
                    <p>{translate('menu_endding_noreward')}</p>
                )}
            </div>

            <style>
                {`
                    @keyframes frameFadeIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `}
            </style>
        </div>
    );
}
