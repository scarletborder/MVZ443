import React, { useEffect, useState } from 'react';
import { FortuneCardProps } from './card/card';
import DraggableFortuneCard from './card/draggable_card';


export function randomFortuneCard() {
    const [cardData, setCardData] = useState<FortuneCardProps | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCardData = async () => {
            try {
                const number = 2; // 目前的卡片数量
                const idx = Math.floor(Math.random() * number) + 1;
                // 动态加载 JSON 文件，假设路径为 public/fortune_card/ 目录下
                const json = await import(`../../../public/fortune_card/${idx}.json`);

                const card: FortuneCardProps = {
                    index: idx,
                    level: json.level,
                    description: json.description,
                    comment: json.comment,
                    details: json.details,
                    extras: json.extras
                };

                setCardData(card);
            } catch (error) {
                console.error("Failed to load fortune card:", error);
                setCardData({
                    index: 0,
                    level: "超大凶",
                    description: {
                        main: "名为网络错误的凶兆",
                        sub: "OFFLINE",
                        ability: "无法加载卡片数据程度的能力"
                    },
                    comment: "请检查网络连接",
                    details: { "状态": "加载失败" },
                    extras: "开发者说：请稍后再试"
                });
            } finally {
                setLoading(false);
            }
        };

        loadCardData();
    }, []);

    if (loading) {
        return (
            <div
                style={{
                    width: '90%',
                    height: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                加载中...
            </div>
        );
    }

    if (!cardData) {
        return null;
    }

    return <DraggableFortuneCard {...cardData} />;
}
