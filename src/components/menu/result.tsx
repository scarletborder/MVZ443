import { useEffect, useRef } from 'react';
import { useCreation, useMount } from 'ahooks';
import { useSaveManager } from '../../context/save_ctx';
import { OnWin, ProgressReward } from '../../game/models/IRecord';
import { ChapterDataRecords, StageDataRecords } from '../../game/utils/loader';
import Stuff from '../../constants/stuffs';
import { useLocaleMessages } from '../../hooks/useLocaleMessages';
import { PlantLibrary } from '../../game/managers/library/PlantLibrary';

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
    const hasSavedRef = useRef(false);

    const { translate } = useLocaleMessages();

    // 状态存储计算好的字符串显示
    const unlockedLevelsStr = useCreation(() => {
        if (!onWin) return "无";
        if (!onWin.unLock || onWin.unLock.length === 0) return "无";
        
        const computedLevels = onWin.unLock.map((cpid) => {
            const stage = StageDataRecords[cpid];
            const chapter = ChapterDataRecords[stage.chapterID];
            return `${translate(chapter.nameKey)} - ${translate(stage.nameKey)}`;
        }).filter(item => item !== "");
        return computedLevels.length > 0 ? computedLevels.join(" ") : "无";
    }, [onWin, translate]);

    const unlockedPlantsStr = useCreation(() => {
        if (!onWin) return "无";
        if (!onWin.unLockPlant || onWin.unLockPlant.length === 0) return "无";
        
        const computedPlants = onWin.unLockPlant.map((pid) => {
            return translate(PlantLibrary.GetModel(pid)?.nameKey ?? 'unknown plant');
        }).filter(item => item !== "");
        return computedPlants.length > 0 ? computedPlants.join(" ") : "无";
    }, [onWin, translate]);

    useEffect(() => {
        if (!hasSavedRef.current) {
            if (progressRewards === undefined) return; // 进度奖励未初始化
            console.log("保存进度奖励");
            hasSavedRef.current = true;

            const saveGameProgress = async () => {
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
                
                try {
                    await saveManager.saveProgress();
                } catch (error) {
                    console.error('保存失败:', error);
                }
            };

            saveGameProgress();
        }
    }, [progressRewards, onWin, isWin]);

    // 移除这个 useEffect，因为我们已经使用 useCreation 来处理了

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
