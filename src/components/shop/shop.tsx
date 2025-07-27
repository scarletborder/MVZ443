// src/components/ShopSelector.tsx
import React, { useRef } from 'react';
import { item, IGoods } from './types';
import { GameProgress, useSaveManager } from '../../context/save_ctx';
import { DetailGoods, InitDetail, PurchasedDetailGoods, SidebarGoods } from './widget';
import NewGoodLists from './goods';
import { useSetState, useMount, useUpdateEffect, useMemoizedFn } from 'ahooks';

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
    const [state, setState] = useSetState({
        selectedGoodId: null as number | null,
        previousGoodId: null as number | null,
        animationClass: '',
        displayedGoodId: null as number | null,
        showPurchased: false,
        forceUpdate: 0,
    });
    
    const purchasedIds = useRef<Set<number>>(new Set());
    const isFirstRender = useRef(true);
    const gameManager = useSaveManager();

    const handlePurchaseCallback = useMemoizedFn((id: number) => {
        console.log(`Item ${id} purchased`);
        gameManager.saveProgress();
        setState(s => ({ forceUpdate: s.forceUpdate + 1 }));
    });

    const goodsList: IGoods[] = React.useMemo(() =>
        NewGoodLists(purchasedIds.current, handlePurchaseCallback),
        [state.forceUpdate]
    );

    const getCurrentItems = useMemoizedFn((): item[] => {
        return Array.from(gameManager.currentProgress.items.values());
    });

    const getGoldAmount = useMemoizedFn((): number => {
        const goldItem = gameManager.currentProgress.items.get(1);
        return goldItem ? goldItem.count : 0;
    });

    const couldAfford = useMemoizedFn((good: IGoods): boolean => {
        const priceStructure = good.getPriceStructure();
        const currentItems = getCurrentItems();
        return priceStructure.items.every(priceItem => {
            const inventoryItem = currentItems.find(item => item.type === priceItem.type);
            return inventoryItem && inventoryItem.count >= priceItem.count;
        });
    });

    const canPurchase = useMemoizedFn((progress: GameProgress, good: IGoods): boolean => {
        return good.canPurchase(progress);
    });

    const handlePurchase = useMemoizedFn((good: IGoods) => {
        if (good.hasBought(good.id, gameManager.currentProgress)) return;
        if (!couldAfford(good)) return;
        if (!canPurchase(gameManager.currentProgress, good)) return;

        const priceStructure = good.getPriceStructure();
        priceStructure.items.forEach(priceItem => {
            gameManager.updateItemCount(priceItem.type, -priceItem.count);
        });

        good.afterBought(good.id, gameManager);
        handlePurchaseCallback(good.id);
    });

    const handleGoodSelect = useMemoizedFn((id: number) => {
        setState(prevState => {
            if (id === prevState.selectedGoodId) return prevState;
            
            const newState = { 
                ...prevState,
                previousGoodId: prevState.selectedGoodId, 
                selectedGoodId: id 
            };
            
            if (!isFirstRender.current) {
                if (prevState.selectedGoodId === null || id > prevState.selectedGoodId) {
                    newState.animationClass = 'page-turn-forward-out';
                } else {
                    newState.animationClass = 'page-turn-backward-out';
                }
            } else {
                newState.displayedGoodId = id;
                isFirstRender.current = false;
            }
            
            return newState;
        });
    });

    useUpdateEffect(() => {
        if (state.selectedGoodId !== null && state.animationClass) {
            const selectedGoodId = state.selectedGoodId;
            const animationClass = state.animationClass;
            const timer = setTimeout(() => {
                setState({ displayedGoodId: selectedGoodId });
                if (animationClass === 'page-turn-forward-out') {
                    setState({ animationClass: 'page-turn-forward-in' });
                } else if (animationClass === 'page-turn-backward-out') {
                    setState({ animationClass: 'page-turn-backward-in' });
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [state.selectedGoodId, state.animationClass]);

    useUpdateEffect(() => {
        setState({ animationClass: '', displayedGoodId: null, selectedGoodId: null });
        isFirstRender.current = true;
    }, [state.showPurchased]);

    useMount(() => {
        gameManager.loadProgress(() => {
            setState(s => ({ forceUpdate: s.forceUpdate + 1 }));
        });
    });

    // 计算过滤后的商品列表
    const filteredGoods = React.useMemo(() => {
        return goodsList.filter(good => 
            state.showPurchased === good.hasBought(good.id, gameManager.currentProgress)
        );
    }, [goodsList, state.showPurchased, gameManager.currentProgress]);

    // 计算当前选中的商品
    const selectedGood = React.useMemo(() => {
        if (state.displayedGoodId === null) return null;
        return goodsList.find(g => g.id === state.displayedGoodId);
    }, [goodsList, state.displayedGoodId]);

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
                            setState(prevState => ({ 
                                showPurchased: !prevState.showPurchased, 
                                selectedGoodId: null 
                            }));
                        }}
                        style={{
                            padding: "4px 4px",
                            backgroundColor: state.showPurchased ? "#72B063" : "#719AAC",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "14px"
                        }}
                    >
                        {state.showPurchased ? "已购列表" : "商品列表"}
                    </button>

                    <div
                        onClick={() => {
                            setState({ selectedGoodId: null, displayedGoodId: null });
                        }}
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
                
                {filteredGoods.length === 0 ? (
                    <div style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "#888",
                        fontSize: "14px"
                    }}>
                        {state.showPurchased ? "暂无已购买的商品" : "道具列表为空"}
                    </div>
                ) : (
                    filteredGoods.map(good => (
                        <div key={good.id}>
                            {SidebarGoods({
                                key: good.id,
                                name: good.name,
                                showPrice: !state.showPurchased,
                                price: good.price,
                                isChosen: (key: number) => key === state.selectedGoodId,
                                handleClick: (key: number) => handleGoodSelect(key)
                            })}
                        </div>
                    ))
                )}
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
                    className={state.animationClass}
                    style={{
                        width: "100%",
                        height: "100%",
                        position: "absolute",
                        transformStyle: "preserve-3d",
                        transformOrigin: "left center"
                    }}
                >
                    {state.displayedGoodId === null ? (
                        <InitDetail myItems={getCurrentItems()} />
                    ) : selectedGood ? (
                        !state.showPurchased ? (
                            <DetailGoods
                                good={selectedGood}
                                canAfford={couldAfford(selectedGood)}
                                canPurchase={canPurchase(gameManager.currentProgress, selectedGood)}
                                hasBought={selectedGood.hasBought(selectedGood.id, gameManager.currentProgress)}
                                priceItems={selectedGood.getPriceStructure().items}
                                myItems={getCurrentItems()}
                                handlePurchase={handlePurchase}
                            />
                        ) : (
                            <PurchasedDetailGoods {...selectedGood} />
                        )
                    ) : null}
                </div>
            </div>

            <style>
                {`
                    @keyframes frameFadeIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    @keyframes pageTurnForwardOut {
                        from { transform: rotateY(0deg); opacity: 1; }
                        to { transform: rotateY(90deg); opacity: 0; }
                    }
                    @keyframes pageTurnForwardIn {
                        from { transform: rotateY(-90deg); opacity: 0; }
                        to { transform: rotateY(0deg); opacity: 1; }
                    }
                    @keyframes pageTurnBackwardOut {
                        from { transform: rotateY(0deg); opacity: 1; }
                        to { transform: rotateY(90deg); opacity: 0; }
                    }
                    @keyframes pageTurnBackwardIn {
                        from { transform: rotateY(-90deg); opacity: 0; }
                        to { transform: rotateY(0deg); opacity: 1; }
                    }
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
                    .page-turn-forward-out, .page-turn-backward-out {
                        box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
                    }
                    .page-turn-forward-in, .page-turn-backward-in {
                        box-shadow: -5px 0 15px rgba(0, 0, 0, 0.2);
                    }
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