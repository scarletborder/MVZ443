import { useCallback } from "react";
import { publicUrl } from "../../utils/browser";
import CardpileManager from "../../game/managers/combat/CardpileManager";

export default function Pickaxe() {
  const img = `${publicUrl}/assets/sprite/pickaxe.png`;

  const handleClick = useCallback(() => {
    CardpileManager.Instance.ClickPickaxe();
  }, []);

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
