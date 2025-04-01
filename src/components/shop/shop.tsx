// src/components/ShopSelector.tsx
import React, { useEffect, useState, useCallback } from 'react';
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
    const [purchasedIds] = useState<Set<number>>(new Set());
    const [forceUpdate, setForceUpdate] = useState(0); // Added to force re-render

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

    useEffect(() => {
        gameManager.loadProgress(() => {
            setForceUpdate(prev => prev + 1); // Force re-render after load
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
                height: "100%",
                minHeight: "80px",
                borderRight: "1px solid #444",
                overflowY: "auto",
                padding: "10px",
                display: "flex",
                flexDirection: "column"
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

                {visibleGoods.map(good => (
                    (showPurchased === good.hasBought(good.id, gameManager.currentProgress)) && (
                        SidebarGoods({
                            key: good.id,
                            name: good.name,
                            showPrice: !showPurchased,
                            price: good.price,
                            isChosen: (key: number) => key === selectedGoodId,
                            handleClick: (key: number) => setSelectedGoodId(key)
                        })
                    )
                ))}
            </div>

            <div style={{
                width: "70%",
                height: "100%",
                padding: "20px"
            }}>
                {selectedGoodId !== null && !showPurchased && (() => {
                    const selectedGood = goodsList.find(g => g.id === selectedGoodId);
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

                {selectedGoodId !== null && showPurchased && (() => {
                    const selectedGood = goodsList.find(g => g.id === selectedGoodId);;
                    if (!selectedGood) return null;

                    return (PurchasedDetailGoods(selectedGood));
                })()}

                {selectedGoodId === null && InitDetail({
                    myItems: getCurrentItems()
                })}
            </div>
        </div>
    );
};

export default ShopSelector;
