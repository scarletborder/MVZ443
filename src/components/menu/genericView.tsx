// genericView.tsx
import { useState } from 'react';
import { useLocaleMessages } from '../../hooks/useLocaleMessages';

interface Item {
    name: string;
    image?: string;
    details: string;
    extraEle?: JSX.Element;
}

interface Props {
    width: number;
    height: number;
    title: string;
    items: Item[];
    onBack: () => void;
}

export default function GenericView({ width, height, title, items, onBack }: Props) {
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [selectedItemImage, setSelectedItemImage] = useState<string | null>(null);
    const { translate } = useLocaleMessages();

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
            {/* 左侧50% - 可滚动列表 */}
            <div style={{
                width: "50%",
                height: "100%",
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
                }}>{title}</p>

                {Array(Math.ceil(items.length / 5)).fill(0).map((_, rowIndex) => (
                    <div key={rowIndex} style={{
                        display: "flex",
                        justifyContent: "flex-start",
                        marginBottom: "20px",

                    }}>
                        {items.slice(rowIndex * 5, (rowIndex + 1) * 5).map((item, index) => (
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
                                onClick={() => {
                                    setSelectedItem(item.name);
                                    setSelectedItemImage(item.image ? item.image : null)
                                }}
                            >
                                {item.image && item.image !== "" && (
                                    <div style={{ width: "64px", height: "64px", overflow: "hidden" }}>
                                        <img src={item.image} alt={item.name} style={{ display: "block" }} draggable="false" />
                                    </div>
                                )}
                                <div style={{ color: "#ddd", fontSize: "14px" }}>{item.name}</div>
                                {item.extraEle ? item.extraEle : null}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* 右侧50% - 详情显示 */}
            <div style={{
                width: "40%",
                height: "100%",
                position: "absolute",
                right: 0,
                top: 0,
                padding: "20px",
                color: "#ddd",
                overflowY: "auto",
                scrollbarWidth: "thin",
                scrollbarColor: "#666 #333",
                background: "rgba(30, 30, 30, 0.9)"
            }}>

                <h2 style={{ marginBottom: "2px" }}>{selectedItem}</h2>
                {selectedItem ? (
                    <div style={{ whiteSpace: "pre-wrap" }}>
                        {items.find(item => item.name === selectedItem)?.details || "未找到详情"}
                    </div>
                ) : (
                    <div>请在左侧选择一个项目以查看详情</div>
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
