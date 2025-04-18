import React, { useEffect, useState } from 'react';
import { useSaveManager } from '../../context/save_ctx';
import PlantFactoryMap from '../../game/presets/plant';
import { publicUrl } from '../../utils/browser';
import { item } from '../shop/types';
import StuffList from '../shop/stuff_list';

interface Props {
    width: number;
    height?: number;
    onBack: () => void;
}

interface PokedexItem {
    name: string;
    image: string;
    details: string;
    pid: number;
    level: number;
}

export default function Pokedex({ width, height, onBack }: Props) {
    if (height === undefined) {
        height = width * 3 / 4;
    }

    const [pokedexItems, setPokedexItems] = useState<PokedexItem[]>([]);
    const [selectedItemName, setSelectedItemName] = useState<string | null>(null);

    // 用于实现滑动动画的状态
    const [displayedItemName, setDisplayedItemName] = useState<string | null>(null);
    const [animationClass, setAnimationClass] = useState<string>('');

    const saveManager = useSaveManager();
    const plants = saveManager.currentProgress.plants;

    useEffect(() => {
        const tmpList = plants
            .sort((a, b) => a.pid - b.pid)
            .map((plant) => {
                const plantObj = PlantFactoryMap[plant.pid];
                return {
                    name: `${plantObj.name} LV.${plant.level}`,
                    details: plantObj.description(),
                    image: `${publicUrl}/assets/card/${plantObj.texture}.png`,
                    pid: plant.pid,
                    level: plant.level,
                };
            });
        setPokedexItems(tmpList);
    }, [plants]);

    // 当selectedItemName发生变化时，触发滑动动画
    useEffect(() => {
        if (selectedItemName === null) return;
        // 触发"滑出"动画
        setAnimationClass('slide-out');
        const timer = setTimeout(() => {
            setDisplayedItemName(selectedItemName);
            setAnimationClass('slide-in');
        }, 300); // 滑出动画持续300ms，可根据需要调整
        return () => clearTimeout(timer);
    }, [selectedItemName]);

    const getCurrentItems = (): item[] => {
        return Array.from(saveManager.currentProgress.items.values());
    };

    const canUpgrade = (pid: number, level: number): boolean => {
        const nextLevelStuff = PlantFactoryMap[pid].NextLevelStuff(level);
        const currentItems = getCurrentItems();
        const currentItemsMap = new Map(currentItems.map(item => [item.type, item.count]));
        return nextLevelStuff.every(item => (currentItemsMap.get(item.type) || 0) >= item.count);
    };

    const handleUpgrade = (pid: number, level: number) => {
        if (!canUpgrade(pid, level)) return;

        const nextLevelStuff = PlantFactoryMap[pid].NextLevelStuff(level);
        nextLevelStuff.forEach(item => {
            saveManager.updateItemCount(item.type, -item.count);
        });

        const plantIndex = plants.findIndex(p => p.pid === pid && p.level === level);
        if (plantIndex !== -1) {
            plants[plantIndex].level += 1;
            saveManager.saveProgress();
            setPokedexItems(prevItems =>
                prevItems.map(item =>
                    item.pid === pid && item.level === level
                        ? { ...item, name: `${PlantFactoryMap[pid].name} LV.${level + 1}`, level: level + 1 }
                        : item
                )
            );
            // 升级后直接选中新等级的项
            setSelectedItemName(`${PlantFactoryMap[pid].name} LV.${level + 1}`);
        }
    };

    return (
        <div style={{
            width: `${width}px`,
            height: `${height}px`,
            perspective: '1200px', // 保留 perspective 以增强3D效果
            background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
            position: "relative",
            overflow: "hidden",
            border: "2px solid #444",
            boxShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
            animation: "frameFadeIn 0.5s ease-out"
        }}>
            {/* Left Sidebar - Scrollable List */}
            <div style={{
                width: "50%",
                height: "90%",
                position: "absolute",
                left: 0,
                top: 0,
                background: "rgba(20, 20, 20, 0.85)",
                backdropFilter: "blur(5px)",
                overflowY: "auto",
                scrollbarWidth: "thin",
                scrollbarColor: "#666 #333",
                padding: "60px 20px 20px 20px"
            }}>
                <button
                    style={{
                        position: "absolute",
                        top: "2%",
                        left: "5%",
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
                    返回
                </button>
                <p style={{
                    position: "absolute",
                    top: "0",
                    left: "45%",
                    background: "none",
                    color: "#ddd",
                    fontSize: "24px",
                    fontWeight: "bold"
                }}>图鉴</p>

                {Array(Math.ceil(pokedexItems.length / 5)).fill(0).map((_, rowIndex) => (
                    <div key={rowIndex} style={{
                        display: "flex",
                        justifyContent: "flex-start",
                        marginBottom: "20px",
                    }}>
                        {pokedexItems.slice(rowIndex * 5, (rowIndex + 1) * 5).map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    minWidth: "16%",
                                    maxWidth: "16%",
                                    textAlign: "center",
                                    cursor: "pointer",
                                    border: "2px solid rgba(100, 100, 100, 0.5)",
                                    padding: "1%",
                                    marginRight: "2%",
                                    transition: "all 0.3s ease"
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor = "#00ccff";
                                    e.currentTarget.style.boxShadow = "0 0 8px rgba(0, 204, 255, 0.5)";
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor = "rgba(100, 100, 100, 0.5)";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                                onClick={() => setSelectedItemName(item.name)}
                            >
                                <div style={{ width: "64px", height: "64px", overflow: "hidden" }}>
                                    <img src={item.image} alt={item.name} style={{ display: "block" }} draggable="false" />
                                </div>
                                <div style={{ color: "#ddd", fontSize: "14px" }}>{item.name}</div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Right Sidebar - Details and Upgrade Controls */}
            <div style={{
                width: "40%",
                height: "96%",
                position: "absolute",
                right: 0,
                top: 0,
                padding: "20px",
                color: "#ddd",
                overflowY: "auto",
                scrollbarWidth: "thin",
                scrollbarColor: "#666 #333",
                background: "rgba(30, 30, 30, 0.9)",
                overflow: "hidden" // 确保超出部分隐藏，使滑动动画看起来更自然
            }}>
                <div className={animationClass} style={{
                    position: "relative",
                    width: "103%",
                    height: "100%",
                    overflowY: "auto",
                }}>
                    <h2 style={{ marginBottom: "2px" }}>{displayedItemName || "未选择"}</h2>
                    {displayedItemName ? (
                        <div style={{ whiteSpace: "pre-wrap" }}>
                            {pokedexItems.find(item => item.name === displayedItemName)?.details || "未找到详情"}
                            <hr style={{ border: "1px solid #666", margin: "20px 0" }} />

                            {/* 升级控件区域 */}
                            {(() => {
                                const selectedItem = pokedexItems.find(item => item.name === displayedItemName);
                                if (!selectedItem) return null;

                                const nextLevelStuff = PlantFactoryMap[selectedItem.pid].NextLevelStuff(selectedItem.level);
                                const currentItems = getCurrentItems();
                                const canUpgradeNow = canUpgrade(selectedItem.pid, selectedItem.level);

                                return (
                                    <div>
                                        <h3 style={{ margin: "0 0 10px 0" }}>升级到 LV.{selectedItem.level + 1}</h3>
                                        <StuffList items={nextLevelStuff} currentItems={currentItems} />
                                        <button
                                            onClick={() => handleUpgrade(selectedItem.pid, selectedItem.level)}
                                            disabled={!canUpgradeNow}
                                            style={{
                                                padding: "10px 20px",
                                                background: canUpgradeNow ? "#007bff" : "#ff4444",
                                                border: "none",
                                                color: "#fff",
                                                cursor: canUpgradeNow ? "pointer" : "not-allowed",
                                                marginTop: "10px",
                                                borderRadius: "4px"
                                            }}
                                        >
                                            {canUpgradeNow ? "升级" : "材料不足"}
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <div>请在左侧选择一个项目以查看详情</div>
                    )}
                </div>
            </div>

            <style>
                {`
                    @keyframes frameFadeIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    
                    /* 从下往上滑出的动画 */
                    @keyframes slideOut {
                        0% { transform: translateY(0); opacity: 1; }
                        100% { transform: translateY(-20px); opacity: 0; }
                    }
                    
                    /* 从下往上滑入的动画 */
                    @keyframes slideIn {
                        0% { transform: translateY(100%); opacity: 0; }
                        100% { transform: translateY(0); opacity: 1; }
                    }
                    
                    .slide-out {
                        animation: slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                    }
                    
                    .slide-in {
                        animation: slideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                    }
                    
                    /* 滚动条样式美化 */
                    ::-webkit-scrollbar {
                        width: 8px;
                    }
                    
                    ::-webkit-scrollbar-track {
                        background: rgba(30, 30, 30, 0.5);
                        border-radius: 4px;
                    }
                    
                    ::-webkit-scrollbar-thumb {
                        background: #666;
                        border-radius: 4px;
                    }
                    
                    ::-webkit-scrollbar-thumb:hover {
                        background: #888;
                    }
                `}
            </style>
        </div>
    );
}