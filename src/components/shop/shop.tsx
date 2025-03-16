// src/components/ShopSelector.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { item, IGoods, NewGoodLists } from './types';
import { GameProgress, useSaveManager } from '../../context/save_ctx';

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

    const itemsPerPage = Math.min(6, Math.floor((height - 80) / 80));
    const visibleGoods = goodsList.slice(0, itemsPerPage);

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
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                    padding: "5px"
                }}>
                    <button
                        onClick={onBack}
                        style={{
                            padding: "6px 12px",
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
                    <span style={{
                        color: "#ffd700",
                        fontSize: "16px",
                        fontWeight: "bold"
                    }}>
                        Gold: {getGoldAmount()}
                    </span>
                </div>

                {visibleGoods.map(good => (
                    <div
                        key={good.id}
                        style={{
                            padding: "5px",
                            margin: "2px 0",
                            background: good.hasBought(good.id, gameManager.currentProgress) ? "#666" : "#333",
                            border: selectedGoodId === good.id ? "2px solid #fff" : "1px solid #555",
                            cursor: good.hasBought(good.id, gameManager.currentProgress) ? "not-allowed" : "pointer",
                            opacity: good.hasBought(good.id, gameManager.currentProgress) ? 0.6 : 1,
                            minHeight: "60px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center"
                        }}
                        onClick={() => !good.hasBought(good.id, gameManager.currentProgress) && setSelectedGoodId(good.id)}
                    >
                        <h3 style={{
                            margin: "0",
                            fontSize: "14px",
                            lineHeight: "1.2"
                        }}>{good.name}</h3>
                        <p style={{
                            margin: "2px 0 0 0",
                            fontSize: "12px",
                            lineHeight: "1.2"
                        }}>Price: {good.price}</p>
                    </div>
                ))}
            </div>

            <div style={{
                width: "70%",
                height: "100%",
                padding: "20px"
            }}>
                {selectedGoodId !== null && (() => {
                    const selectedGood = goodsList.find(g => g.id === selectedGoodId);
                    if (!selectedGood) return null;

                    const canAfford = couldAfford(selectedGood);
                    const purchaseAllowed = canPurchase(gameManager.currentProgress, selectedGood);
                    const hasBought = selectedGood.hasBought(selectedGood.id, gameManager.currentProgress);

                    return (
                        <div>
                            <h2>{selectedGood.name}</h2>
                            <p>{selectedGood.description()}</p>
                            <p>Price: {selectedGood.price}</p>
                            {purchaseAllowed ? (
                                <button
                                    disabled={hasBought || !canAfford}
                                    onClick={() => handlePurchase(selectedGood)}
                                    style={{
                                        padding: "10px 20px",
                                        background: hasBought || !canAfford ? "#666" : "#007bff",
                                        border: "none",
                                        color: "#fff",
                                        cursor: hasBought || !canAfford ? "not-allowed" : "pointer",
                                        marginTop: "20px"
                                    }}
                                >
                                    {hasBought ? "Purchased" : !canAfford ? "Cannot Afford" : "Purchase"}
                                </button>
                            ) : (
                                <span style={{
                                    color: "#ff4444",
                                    fontSize: "16px",
                                    fontWeight: "bold",
                                    marginTop: "20px",
                                    display: "block"
                                }}>
                                    Not Allowed
                                </span>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default ShopSelector;
