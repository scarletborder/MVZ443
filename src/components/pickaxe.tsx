import { useGameContext } from "../context/garden_ctx";
import { useSettings } from "../context/settings_ctx";
import { EventBus } from "../game/EventBus";
import { IRefPhaserGame } from "../game/PhaserGame";
import { publicUrl } from "../utils/browser";

interface Props {
    sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
}

export default function Pickaxe({ sceneRef }: Props) {
    const { isPaused } = useGameContext();
    const settings = useSettings();
    const img = `${publicUrl}/assets/sprite/pickaxe.png`;
    
    const handleClick = () => {
        EventBus.emit('card-deselected', { pid: null }); // 通知卡片取消选中
        if (!sceneRef.current) return;
        if (isPaused && (!settings.isBluePrint)) return;
        EventBus.emit('pickaxe-click', null);
    }

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
