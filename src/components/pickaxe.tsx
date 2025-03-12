import { useGameContext } from "../context/garden_ctx";
import { EventBus } from "../game/EventBus";
import { IRefPhaserGame } from "../game/PhaserGame";
import { publicUrl } from "../utils/browser";

interface Props {
    sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
}

export default function Pickaxe({ sceneRef }: Props) {
    const { isPaused } = useGameContext();
    const img = `${publicUrl}/assets/sprite/pickaxe.png`;
    const handleClick = () => {
        EventBus.emit('pickaxe-click', null);
    }

    return (
        <div className="pickaxe"
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
