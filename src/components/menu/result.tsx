import { useEffect, useRef, useState } from 'react';
import { useSaveManager } from '../../context/save_ctx';
import { OnWin, ProgressReward } from '../../game/models/IRecord';
import { ChapterDataRecords, StageDataRecords } from '../../game/utils/loader';
import PlantFactoryMap from '../../game/presets/plant';


interface Props {
    width: number;
    height: number;
    isWin: boolean;
    onWin?: OnWin; // Optional if the game is won
    progressRewards: ProgressReward[] | undefined;
    myProgress: number;
    onBack: () => void;
}

export default function GameResultView({ width, height, isWin, onWin, progressRewards, myProgress, onBack }: Props) {
    const saveManager = useSaveManager();
    const hasSavedRef = useRef(false); // 使用 ref 替代状态

    useEffect(() => {
        if (!hasSavedRef.current) {
            if (progressRewards === undefined) return; // 未初始化好
            console.log("保存进度奖励");
            hasSavedRef.current = true; // 设置标志，防止重复保存

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
            // 可以确保每次结算领取一次,并且不刷新网页情况可以每开新关卡领取一次
        }
    }, [progressRewards, onWin, isWin]); // 移除 hasSaved 依赖


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
            {/* Back to Home Button */}
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
                返回主页
            </button>

            {/* Left Side - Game Result */}
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
                    游戏结果
                </h2>
                {isWin ? (
                    <div>
                        <p style={{ fontSize: "18px", marginBottom: "10px" }}>胜利！</p>
                        {onWin && (
                            <>
                                <p>解锁关卡: {onWin.unLock.length > 0 ?

                                    Array.from(onWin.unLock, (cpid) => {
                                        if (saveManager.currentProgress.level.has(cpid)) {
                                            return null;
                                        }
                                        const stage = StageDataRecords[cpid];
                                        const chapter = ChapterDataRecords[stage.chapterID];
                                        return `${chapter.name} - ${stage.name}`;
                                    }).join(" ")
                                    : "无"}</p>
                                <p>解锁器械: {onWin.unLockPlant.length > 0 ?
                                    Array.from(onWin.unLockPlant, (pid) => {
                                        if (saveManager.currentProgress.plants.some(p => p.pid === pid)) {
                                            // 已有
                                            return null;
                                        }
                                        return PlantFactoryMap[pid].name;
                                    }).join(" ")
                                    : "无"}</p>
                            </>
                        )}
                    </div>
                ) : (
                    <p style={{ fontSize: "18px" }}>失败！请再接再厉。</p>
                )}
            </div>

            {/* Right Side - Progress Rewards */}
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
                    进度奖励 : {myProgress}%
                </h2>
                {(progressRewards !== undefined && progressRewards.length > 0) ? (
                    progressRewards.map((reward, index) => (
                        (myProgress >= reward.progress) &&
                        (<div key={index} style={{ marginBottom: "15px" }}>
                            <p>进度: {reward.progress}%</p>
                            <p>奖励: 类型 {reward.reward.type}, 数量 {reward.reward.count}</p>
                        </div>)
                    ))
                ) : (
                    <p>暂无进度奖励</p>
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
