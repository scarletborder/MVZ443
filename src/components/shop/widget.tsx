/**
 * 在这里放商店页面的控件
 */

import { randomFortuneCard as RandomFortuneCard } from "./fortune_card";
import StuffList, { CurrentStuffs } from "./stuff_list";
import { IGoods, item } from "./types";


interface SidebarGoodsProps {
    key: number,
    name: string,
    price: number,
    showPrice: boolean,
    isChosen: (key: number) => boolean,
    handleClick: (key: number) => void,
}

/**
 * 商品列表
 */
export function SidebarGoods({ key, name, price, showPrice, isChosen, handleClick }: SidebarGoodsProps) {
    return (<div
        key={key}
        style={{
            padding: "5px",
            margin: "2px 0",
            background: "#333",
            border: isChosen(key) ? "2px solid #fff" : "1px solid #555",
            cursor: "pointer",
            minHeight: "60px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
        }}
        onClick={() => {
            handleClick(key);
        }}
    >
        <h3 style={{
            margin: "0",
            fontSize: "14px",
            lineHeight: "1.2"
        }}>{name}</h3>
        {showPrice && (<p style={{
            margin: "2px 0 0 0",
            fontSize: "12px",
            lineHeight: "1.2"
        }}>Price: {price}</p>)}
    </div>)
}


interface DetailGoodsProps {
    good: IGoods,
    canAfford: boolean,
    canPurchase: boolean,
    hasBought: boolean,

    priceItems: item[],
    myItems: item[],

    handlePurchase: (good: IGoods) => void,
}

export function DetailGoods({ good, canAfford, canPurchase, hasBought,
    priceItems, myItems, handlePurchase }: DetailGoodsProps) {

    return (
        <div>
            <h2>{good.name}</h2>
            <p>{good.description()}</p>
            <StuffList
                items={priceItems}
                currentItems={myItems}
            />

            {canPurchase ? (
                <button
                    disabled={hasBought || !canAfford}
                    onClick={() => handlePurchase(good)}
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
}



export function PurchasedDetailGoods(good: IGoods) {
    return (
        <div>
            <h2>{good.name}</h2>
            <p>{good.description()}</p>
        </div>
    );
}

interface initDetailProps {
    myItems: item[],
}


export function InitDetail({ myItems }: initDetailProps) {
    return (<div
        style={
            {
                display: "flex",
                overflowY: 'hidden',
                overflowX: 'hidden',
                scrollbarWidth: 'thin',
                scrollbarColor: '#888 #333',
                height: "88%",
                padding: "20px",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "14px",
                flex: "1",
                flexDirection: "row",
                alignContent: 'space-between',

            }
        }
    >

        <div
            style={{
                width: "50%",
                overflowY: "auto",
            }}
        >{CurrentStuffs(myItems)}</div>

        <div
            style={{
                width: "60%",
            }}>
            <RandomFortuneCard />
        </div>
    </div>)
}

