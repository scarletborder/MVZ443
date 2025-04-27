import React, { useEffect, useState, useRef } from 'react';
import { useSaveManager } from '../../context/save_ctx';
import PlantFactoryMap from '../../game/presets/plant';
import { publicUrl } from '../../utils/browser';
import { item } from '../shop/types';
import StuffList from '../shop/stuff_list';
import { getUpgradeMaterials, MaterialRequirement } from '../../game/utils/sqlite/materials';
import { useLocaleMessages } from '../../hooks/useLocaleMessages';

interface Props {
    width: number;
    height?: number;
    onBack: () => void;
}

interface PokedexItem {
    pid: number;
    nameKey: string;
    descriptionKey: string;
    image: string;
    level: number;
}

export default function Pokedex({ width, height, onBack }: Props) {
    if (height === undefined) {
        height = width * 3 / 4;
    }

    const [pokedexItems, setPokedexItems] = useState<Map<number, PokedexItem>>(new Map());
    const [selectedItemPid, setSelectedItemPid] = useState<number | null>(null);
    const [animationClass, setAnimationClass] = useState<string>('');
    const [upgradeMaterials, setUpgradeMaterials] = useState<MaterialRequirement[]>([]);
    const [loadingMaterials, setLoadingMaterials] = useState<boolean>(false);

    // 当前显示的项目
    const [selectedItem, setSelectedItem] = useState<PokedexItem | null>(null);
    // 新增：下一个将要显示的项目（在动画完成后才会显示）
    const nextItemRef = useRef<PokedexItem | null>(null);

    // 跟踪是否正在进行动画
    const isAnimating = useRef(false);
    // 新增：用于跟踪和取消动画定时器
    const animationTimersRef = useRef<{ main?: number, enter?: number, finish?: number }>({});

    const saveManager = useSaveManager();
    const { translate } = useLocaleMessages();

    const plants = saveManager.currentProgress.plants;

    useEffect(() => {
        const tmpMap = new Map<number, PokedexItem>();
        plants.sort((a, b) => a.pid - b.pid)
            .map((plant) => {
                const plantObj = PlantFactoryMap[plant.pid];
                tmpMap.set(plant.pid, {
                    pid: plant.pid,
                    nameKey: plantObj.nameKey,
                    descriptionKey: plantObj.descriptionKey,
                    image: `${publicUrl}/assets/card/${plantObj.texture}.png`,
                    level: plant.level,
                });
            });

        setPokedexItems(tmpMap);
    }, [plants]);

    // 清除所有动画定时器的辅助函数
    const clearAnimationTimers = () => {
        if (animationTimersRef.current.main) {
            clearTimeout(animationTimersRef.current.main);
        }
        if (animationTimersRef.current.enter) {
            clearTimeout(animationTimersRef.current.enter);
        }
        if (animationTimersRef.current.finish) {
            clearTimeout(animationTimersRef.current.finish);
        }
        animationTimersRef.current = {};
    };

    // 修改：处理选中项目变化的逻辑
    useEffect(() => {
        if (selectedItemPid === null) return;

        // 清除任何正在进行的动画定时器
        clearAnimationTimers();

        // 查找将要显示的新项目，但先不设置到selectedItem
        const nextItem = pokedexItems.get(selectedItemPid) || null;
        nextItemRef.current = nextItem;

        // 如果当前没有选中项，说明是首次选择，直接设置
        if (!selectedItem) {
            setSelectedItem(nextItem);
            return;
        }

        // 开始退出动画
        isAnimating.current = true;
        setAnimationClass('slide-out');

        // 等待退出动画完成后，更新显示内容并开始进入动画
        animationTimersRef.current.main = window.setTimeout(() => {
            // 更新当前显示的项目为下一个项目
            setSelectedItem(nextItemRef.current);

            // 延迟一小段时间后开始进入动画，确保DOM已更新
            animationTimersRef.current.enter = window.setTimeout(() => {
                setAnimationClass('slide-in');

                // 在进入动画完成后标记动画结束
                animationTimersRef.current.finish = window.setTimeout(() => {
                    isAnimating.current = false;
                }, 400); // 匹配slide-in动画持续时间
            }, 50);

        }, 300); // 匹配slide-out动画持续时间

        return () => clearAnimationTimers();
    }, [selectedItemPid, pokedexItems]);

    // 加载升级材料
    useEffect(() => {
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

            // 更新pokedexItems集合中的对应项
            setPokedexItems(prev => {
                const newMap = new Map(prev);
                if (newMap.has(pid)) {
                    const item = newMap.get(pid)!;
                    newMap.set(pid, { ...item, level: newLevel });
                }
                return newMap;
            });

            // 直接更新选中项，只更新level值
            setSelectedItem({
                ...selectedItem,
                level: newLevel
            });
        }
    };

    // 选择一个新的项目（已修改）
    const selectItem = (pid: number) => {
        // 如果点击的是当前已选中的项目，不做任何处理
        if (pid === selectedItemPid) return;

        // 即使动画正在进行中，也允许选择新项目
        // 之前的动画会被新的动画取消
        setSelectedItemPid(pid);
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
                    {translate('menu_back')}
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
                {Array(Math.ceil(pokedexItems.size / 5)).fill(0).map((_, rowIndex) => (
                    <div key={rowIndex} style={{
                        display: "flex",
                        justifyContent: "flex-start",
                        marginBottom: "20px",
                    }}>
                        {Array.from(pokedexItems.keys()).slice(rowIndex * 5, (rowIndex + 1) * 5).map((pid, index) => (
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
                                onClick={() => selectItem(pid)}
                            >
                                <div style={{ width: "64px", height: "64px", overflow: "hidden" }}>
                                    {pokedexItems.get(pid) && (
                                        <img
                                            src={pokedexItems.get(pid)!.image}
                                            alt={translate(pokedexItems.get(pid)!.nameKey)}
                                            style={{ display: "block" }}
                                            draggable="false"
                                        />
                                    )}
                                </div>
                                <div style={{ color: "#ddd", fontSize: "14px" }}>
                                    {pokedexItems.get(pid) ? `${translate(pokedexItems.get(pid)!.nameKey)} LV.${pokedexItems.get(pid)!.level}` : ""}
                                </div>
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
                    width: "103%"
                }}>
                    <h2 style={{ marginBottom: '8px' }}>
                        {selectedItem ? `${translate(selectedItem.nameKey)} LV.${selectedItem.level}` : '未选择'}
                    </h2>


                    {selectedItem ? (
                        <>
                            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
                                {translate(selectedItem.descriptionKey)}
                            </div>
                            <hr style={{ borderColor: '#666', margin: '16px 0' }} />
                            <div>
                                <h3 style={{ margin: '0 0 12px 0' }}>
                                    升级到 LV.{selectedItem.level + 1}
                                </h3>
                                {/* 材料列表 */}
                                <StuffList
                                    items={upgradeMaterials}
                                    currentItems={getCurrentItems()}
                                    translate={translate}
                                />

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

            {/* 样式定义（修复格式问题） */}
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