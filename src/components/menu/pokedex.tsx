import React, { useEffect, useState, useRef } from 'react';
import { useSaveManager } from '../../context/save_ctx';
import PlantFactoryMap from '../../game/presets/plant';
import { publicUrl } from '../../utils/browser';
import { item } from '../shop/types';
import StuffList from '../shop/stuff_list';
import { getUpgradeMaterials, MaterialRequirement } from '../../game/utils/sqlite/materials';

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
    const [displayedItemName, setDisplayedItemName] = useState<string | null>(null);
    const [animationClass, setAnimationClass] = useState<string>('');
    const [upgradeMaterials, setUpgradeMaterials] = useState<MaterialRequirement[]>([]);
    const [loadingMaterials, setLoadingMaterials] = useState<boolean>(false);

    // 新增：保存当前选中的项目作为状态变量，确保它始终有效
    const [selectedItem, setSelectedItem] = useState<PokedexItem | null>(null);

    // 跟踪是否正在进行动画
    const isAnimating = useRef(false);

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

    // 当选中项目名称变化时，启动动画并更新显示
    useEffect(() => {
        if (selectedItemName === null) return;

        isAnimating.current = true;
        setAnimationClass('slide-out');

        const timer = setTimeout(() => {
            setDisplayedItemName(selectedItemName);
            setAnimationClass('slide-in');

            // 在动画完成后标记动画结束
            setTimeout(() => {
                isAnimating.current = false;
            }, 400); // 匹配 slide-in 动画的持续时间

        }, 300); // 匹配 slide-out 动画的持续时间

        return () => clearTimeout(timer);
    }, [selectedItemName]);

    // 当显示的项目名称改变时，更新选中的项目对象
    useEffect(() => {
        if (displayedItemName) {
            const item = pokedexItems.find(i => i.name === displayedItemName);
            if (item) {
                setSelectedItem(item);
            }
        } else {
            setSelectedItem(null);
        }
    }, [displayedItemName, pokedexItems]);

    // 加载数据库中的升级材料
    useEffect(() => {
        // 直接使用 selectedItem 而不是通过 displayedItemName 查找
        if (!selectedItem) {
            setUpgradeMaterials([]);
            return;
        }

        setLoadingMaterials(true);
        getUpgradeMaterials(selectedItem.pid, selectedItem.level)
            .then(mats => setUpgradeMaterials(mats))
            .catch(err => {
                console.error('加载升级材料失败', err);
                setUpgradeMaterials([]);
            })
            .finally(() => setLoadingMaterials(false));
    }, [selectedItem]);

    const getCurrentItems = (): item[] => {
        return Array.from(saveManager.currentProgress.items.values());
    };

    const canUpgrade = (): boolean => {
        if (loadingMaterials || !selectedItem) return false;
        const currentItems = getCurrentItems();
        const currentMap = new Map(currentItems.map(i => [i.type, i.count]));
        return upgradeMaterials.length > 0 && upgradeMaterials.every(mat => (currentMap.get(mat.type) || 0) >= mat.count);
    };

    const handleUpgrade = () => {
        // 防止动画过渡中点击或重复点击
        if (isAnimating.current || !selectedItem || !canUpgrade()) return;

        // 使用状态中保存的 selectedItem，而不是每次重新查找
        const { pid, level } = selectedItem;

        upgradeMaterials.forEach(mat => {
            saveManager.updateItemCount(mat.type, -mat.count);
        });

        const plantIndex = plants.findIndex(p => p.pid === pid && p.level === level);
        if (plantIndex !== -1) {
            // 更新植物等级
            plants[plantIndex].level += 1;
            saveManager.saveProgress();

            // 更新项目列表
            const newLevel = level + 1;
            const newName = `${PlantFactoryMap[pid].name} LV.${newLevel}`;

            setPokedexItems(prev =>
                prev.map(item =>
                    item.pid === pid && item.level === level
                        ? { ...item, name: newName, level: newLevel }
                        : item
                )
            );

            // 直接更新选中项
            setSelectedItem({
                ...selectedItem,
                name: newName,
                level: newLevel
            });

            // 更新显示名称（先更新选中名称，触发动画）
            setSelectedItemName(newName);
        }
    };

    return (
        <div style={{
            width: `${width}px`,
            height: `${height}px`,
            perspective: '1200px',
            background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
            position: "relative",
            overflow: "hidden",
            border: "2px solid #444",
            boxShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
            animation: "frameFadeIn 0.5s ease-out"
        }}>
            {/* 左侧边栏（保持不变） */}
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
                {/* 返回按钮（保持不变） */}
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

                {/* 项目网格（保持不变） */}
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

            {/* 右侧详情面板 */}
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
                overflow: "hidden"
            }}>
                <div className={animationClass} style={{
                    position: "relative",
                    width: "103%",
                    height: "100%",
                    overflowY: "auto",
                }}>
                    <h2 style={{ marginBottom: '8px' }}>
                        {displayedItemName || '未选择'}
                    </h2>

                    {selectedItem ? (
                        <>
                            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
                                {selectedItem.details}
                            </div>
                            <hr style={{ borderColor: '#666', margin: '16px 0' }} />
                            <div>
                                <h3 style={{ margin: '0 0 12px 0' }}>
                                    升级到 LV.{selectedItem.level + 1}
                                </h3>
                                {/* 材料列表 */}
                                <StuffList items={upgradeMaterials} currentItems={getCurrentItems()} />

                                {/* 升级按钮 - 使用新的handleUpgrade函数，不依赖selected参数 */}
                                <button
                                    onClick={handleUpgrade}
                                    disabled={!canUpgrade()}
                                    style={{
                                        padding: '10px 24px',
                                        marginTop: '16px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        background: canUpgrade() ? '#007bff' : '#555',
                                        color: '#fff',
                                        cursor: canUpgrade() ? 'pointer' : 'not-allowed',
                                        opacity: loadingMaterials ? 0.6 : 1,
                                    }}
                                >
                                    {loadingMaterials ? '加载中...' : (canUpgrade() ? '升级' : '材料不足')}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ paddingTop: '40px', textAlign: 'center', color: '#888' }}>
                            请选择左侧项目查看详情
                        </div>
                    )}
                </div>
            </div>

            {/* 样式定义（保持不变） */}
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