import { useCallback } from "react";
import { IRefPhaserGame } from "../../game/PhaserGame";
import { publicUrl } from "../../utils/browser";
import CardpileManager from "../../game/managers/combat/CardpileManager";

interface Props {
  sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
}

export default function Pickaxe({ sceneRef }: Props) {
  const img = `${publicUrl}/assets/sprite/pickaxe.png`;

  const handleClick = useCallback(() => {
    if (!sceneRef.current) return;
    CardpileManager.Instance.ClickPickaxe();
  }, [sceneRef]);

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
