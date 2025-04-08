// src/components/ShopSelector.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { item, IGoods } from './types';
import { GameProgress, useSaveManager } from '../../context/save_ctx';
import { DetailGoods, InitDetail, PurchasedDetailGoods, SidebarGoods } from './widget';
import NewGoodLists from './goods';

interface ShopSelectorProps {
    width: number;
    height: number;
    onBack: () => void;
}

const ShopSelector: React.FC<ShopSelectorProps> = ({
    width,
    height,
    onBack,
}) => {
    const [selectedGoodId, setSelectedGoodId] = useState<number | null>(null);
    const [previousGoodId, setPreviousGoodId] = useState<number | null>(null);
    const [purchasedIds] = useState<Set<number>>(new Set());
    const [forceUpdate, setForceUpdate] = useState(0);

    // 添加动画相关状态
    const [animationClass, setAnimationClass] = useState<string>('');
    const [displayedGoodId, setDisplayedGoodId] = useState<number | null>(null);
    const isFirstRender = useRef(true);

    // 视图类型,false-未购买,true-已购买 
    const [showPurchased, setShowPurchased] = useState(false);

    const gameManager = useSaveManager();

    const handlePurchaseCallback = useCallback((id: number) => {
        console.log(`Item ${id} purchased`);
        gameManager.saveProgress();
        setForceUpdate(prev => prev + 1); // Trigger re-render after purchase
    }, [gameManager]);

    const goodsList: IGoods[] = NewGoodLists(purchasedIds, handlePurchaseCallback);

    const getCurrentItems = useCallback((): item[] => {
        return Array.from(gameManager.currentProgress.items.values());
    }, [gameManager]);

    const getGoldAmount = useCallback((): number => {
        const goldItem = gameManager.currentProgress.items.get(1);
        return goldItem ? goldItem.count : 0;
    }, [gameManager]);

    const couldAfford = useCallback((good: IGoods): boolean => {
        const priceStructure = good.getPriceStructure();
        const currentItems = getCurrentItems();
        return priceStructure.items.every(priceItem => {
            const inventoryItem = currentItems.find(item => item.type === priceItem.type);
            return inventoryItem && inventoryItem.count >= priceItem.count;
        });
    }, [getCurrentItems]);

    const canPurchase = useCallback((progress: GameProgress, good: IGoods): boolean => {
        return good.canPurchase(progress);
    }, []);

    const handlePurchase = useCallback((good: IGoods) => {
        if (good.hasBought(good.id, gameManager.currentProgress)) return;
        if (!couldAfford(good)) return;
        if (!canPurchase(gameManager.currentProgress, good)) return;

        const priceStructure = good.getPriceStructure();
        priceStructure.items.forEach(priceItem => {
            gameManager.updateItemCount(priceItem.type, -priceItem.count);
        });

        good.afterBought(good.id, gameManager);
        handlePurchaseCallback(good.id); // Trigger re-render and save
    }, [gameManager, couldAfford, canPurchase, handlePurchaseCallback]);

    // 处理商品选择变化和动画
    const handleGoodSelect = useCallback((id: number) => {
        if (id === selectedGoodId) return;

        setPreviousGoodId(selectedGoodId);
        setSelectedGoodId(id);

        // 确定翻页方向
        if (!isFirstRender.current) {
            if (selectedGoodId === null || id > selectedGoodId) {
                // 向后翻页（下一页）
                setAnimationClass('page-turn-forward-out');
            } else {
                // 向前翻页（上一页）
                setAnimationClass('page-turn-backward-out');
            }
        } else {
            // 第一次选择，无需动画
            setDisplayedGoodId(id);
            isFirstRender.current = false;
        }
    }, [selectedGoodId]);

    // 监听选择变化，触发动画
    useEffect(() => {
        if (selectedGoodId !== null && animationClass) {
            // 页面退出动画结束后，显示新内容并开始入场动画
            const timer = setTimeout(() => {
                setDisplayedGoodId(selectedGoodId);
                if (animationClass === 'page-turn-forward-out') {
                    setAnimationClass('page-turn-forward-in');
                } else if (animationClass === 'page-turn-backward-out') {
                    setAnimationClass('page-turn-backward-in');
                }
            }, 500); // 与动画时长匹配
            return () => clearTimeout(timer);
        }
    }, [selectedGoodId, animationClass]);

    // 切换视图类型时重置动画状态
    useEffect(() => {
        setAnimationClass('');
        isFirstRender.current = true;
        setDisplayedGoodId(null);
        setSelectedGoodId(null);
    }, [showPurchased]);

    useEffect(() => {
        gameManager.loadProgress(() => {
            setForceUpdate(prev => prev + 1);
        });
    }, [gameManager]);

    const visibleGoods = goodsList;

    return (
        <div style={{
            width: `${width}px`,
            height: `${height}px`,
            background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
            position: "relative",
            overflow: "hidden",
            border: "2px solid #444",
            boxShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
            animation: "frameFadeIn 0.5s ease-out",
            whiteSpace: "pre-wrap",
            display: "flex"
        }}>
            <div style={{
                width: "30%",
                height: "95%",
                minHeight: "80px",
                borderRight: "1px solid #444",
                overflowY: "auto",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                scrollbarWidth: 'thin',
                scrollbarColor: '#888 #333',
            }}>
                <div style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    alignItems: "center",
                    marginBottom: "10px",
                    padding: "2px",
                    gap: "4%"
                }}>
                    <button
                        onClick={onBack}
                        style={{
                            padding: "6px 8px",
                            background: "#444",
                            border: "none",
                            color: "#fff",
                            cursor: "pointer",
                            borderRadius: "4px",
                            fontSize: "14px"
                        }}
                    >
                        Back
                    </button>

                    <button
                        onClick={() => {
                            setShowPurchased(!showPurchased);
                            setSelectedGoodId(null);
                        }}
                        style={{
                            padding: "4px 4px",
                            backgroundColor: showPurchased ? "#72B063" : "#719AAC",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "14px"
                        }}
                    >
                        {showPurchased ? "已购列表" : "商品列表"}
                    </button>

                    <div
                        onClick={() => {
                            setSelectedGoodId(null);
                            setDisplayedGoodId(null);
                        }}
                        // 占有剩下的空间
                        style={{
                            flex: 1,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: "#444",
                            color: "#fff",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            fontSize: "14px"
                        }}
                    >
                        <span style={{
                            color: "#ffd700",
                            fontSize: "16px",
                            fontWeight: "bold",
                            marginLeft: "auto",
                            marginRight: "1%",

                        }}>
                            {getGoldAmount()}$
                        </span>
                    </div>
                </div>
                {visibleGoods.map(good => (
                    (showPurchased === good.hasBought(good.id, gameManager.currentProgress)) && (
                        <div key={good.id}>
                            {SidebarGoods({
                                key: good.id,
                                name: good.name,
                                showPrice: !showPurchased,
                                price: good.price,
                                isChosen: (key: number) => key === selectedGoodId,
                                handleClick: (key: number) => handleGoodSelect(key)
                            })}
                        </div>
                    )
                ))}
            </div>

            <div
                style={{
                    width: "70%",
                    height: "100%",
                    padding: "20px",
                    position: "relative",
                    perspective: "1200px",
                    overflow: "hidden"
                }}
            >
                <div
                    className={animationClass}
                    style={{
                        width: "100%",
                        height: "100%",
                        position: "absolute",
                        transformStyle: "preserve-3d",
                        transformOrigin: "left center" // 所有动画都以左侧为轴心
                    }}
                >
                    {displayedGoodId !== null && !showPurchased && (() => {
                        const selectedGood = goodsList.find(g => g.id === displayedGoodId);
                        if (!selectedGood) return null;

                        const canAfford = couldAfford(selectedGood);
                        const purchaseAllowed = canPurchase(gameManager.currentProgress, selectedGood);
                        const hasBought = selectedGood.hasBought(selectedGood.id, gameManager.currentProgress);

                        return (DetailGoods({
                            good: selectedGood,
                            canAfford,
                            canPurchase: purchaseAllowed,
                            hasBought,
                            priceItems: selectedGood.getPriceStructure().items,
                            myItems: getCurrentItems(),
                            handlePurchase
                        }))
                    })()}

                    {displayedGoodId !== null && showPurchased && (() => {
                        const selectedGood = goodsList.find(g => g.id === displayedGoodId);
                        if (!selectedGood) return null;

                        return (PurchasedDetailGoods(selectedGood));
                    })()}

                    {displayedGoodId === null && InitDetail({
                        myItems: getCurrentItems()
                    })}
                </div>
            </div>

            <style>
                {`
                    @keyframes frameFadeIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    
                    /* 向前翻页（下一页）- 退出动画 */
                    @keyframes pageTurnForwardOut {
                        from { transform: rotateY(0deg); opacity: 1; }
                        to { transform: rotateY(90deg); opacity: 0; }
                    }
                    
                    /* 向前翻页（下一页）- 进入动画 */
                    @keyframes pageTurnForwardIn {
                        from { transform: rotateY(-90deg); opacity: 0; }
                        to { transform: rotateY(0deg); opacity: 1; }
                    }
                    
                    /* 向后翻页（上一页）- 退出动画 */
                    @keyframes pageTurnBackwardOut {
                        from { transform: rotateY(0deg); opacity: 1; }
                        to { transform: rotateY(90deg); opacity: 0; }
                    }
                    
                    /* 向后翻页（上一页）- 进入动画 */
                    @keyframes pageTurnBackwardIn {
                        from { transform: rotateY(-90deg); opacity: 0; }
                        to { transform: rotateY(0deg); opacity: 1; }
                    }
                    
                    /* 统一动画类，全部使用左侧为轴心 */
                    .page-turn-forward-out {
                        animation: pageTurnForwardOut 0.5s ease-in forwards;
                        transform-origin: left center;
                        backface-visibility: hidden;
                    }
                    
                    .page-turn-forward-in {
                        animation: pageTurnForwardIn 0.5s ease-out forwards;
                        transform-origin: left center;
                        backface-visibility: hidden;
                    }
                    
                    .page-turn-backward-out {
                        animation: pageTurnBackwardOut 0.5s ease-in forwards;
                        transform-origin: left center;
                        backface-visibility: hidden;
                    }
                    
                    .page-turn-backward-in {
                        animation: pageTurnBackwardIn 0.5s ease-out forwards;
                        transform-origin: left center;
                        backface-visibility: hidden;
                    }
                    
                    /* 增强书本效果的阴影 */
                    .page-turn-forward-out, .page-turn-backward-out {
                        box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
                    }
                    
                    .page-turn-forward-in, .page-turn-backward-in {
                        box-shadow: -5px 0 15px rgba(0, 0, 0, 0.2);
                    }
                    
                    /* 滚动条样式保持不变 */
                    ::-webkit-scrollbar {
                        width: 8px;
                        height: 8px;
                    }
                    
                    ::-webkit-scrollbar-track {
                        background: rgba(50, 50, 50, 0.5);
                        border-radius: 4px;
                    }
                    
                    ::-webkit-scrollbar-thumb {
                        background: #666;
                        border-radius: 4px;
                    }
                    
                    ::-webkit-scrollbar-thumb:hover {
                        background: #777;
                    }
                `}
            </style>
        </div >
    );
};

export default ShopSelector;