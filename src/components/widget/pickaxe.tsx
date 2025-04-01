import { useEffect, useCallback } from "react";
import { useGameContext } from "../../context/garden_ctx";
import { useSettings } from "../../context/settings_ctx";
import { EventBus } from "../../game/EventBus";
import { IRefPhaserGame } from "../../game/PhaserGame";
import { publicUrl } from "../../utils/browser";

interface Props {
    sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
}

export default function Pickaxe({ sceneRef }: Props) {
    const { isPaused } = useGameContext();
    const settings = useSettings();
    const img = `${publicUrl}/assets/sprite/pickaxe.png`;

    const handleClick = useCallback(() => {
        EventBus.emit('card-deselected', { pid: null }); // 通知卡片取消选中
        if (!sceneRef.current) return;
        if (isPaused && (!settings.isBluePrint)) return;
        EventBus.emit('pickaxe-click', null);
    }, [sceneRef, isPaused, settings.isBluePrint]);

    // 添加键盘事件监听
    useEffect(() => {
        const handleKeyPress = (event: { key: string; }) => {
            if (event.key === 'q' || event.key === 'Q') { // 支持小写和大写 "q"
                handleClick(); // 按下 q 键时调用 handleClick
            }
        };

        // 绑定键盘事件
        window.addEventListener('keydown', handleKeyPress);

        // 清理函数，在组件卸载时移除事件监听器
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [handleClick, isPaused, settings.isBluePrint, sceneRef]); // 依赖项，确保相关状态变化时重新绑定


    return (
        <div className={`pickaxe ${(isPaused && !settings.isBluePrint) ? 'paused' : ''}`}
            onClick={handleClick}
        >
            <div className="pickaxe-content">
                <div className="pickaxe-image">
                    <img src={img} alt="Pickaxe" />
                </div>
            </div>
        </div>
    );
}
