import { DeferredManager } from "../../managers/DeferredManager";
import { ObstacleLibrary } from "../../managers/library/ObstacleLibrary";
import { PositionManager } from "../../managers/view/PositionManager";
import { ObstacleConfig, ObstacleEntity } from "../../models/entities/ObstacleEntity";
import type { Game } from "../../scenes/Game";

namespace ObstacleCmd {
  export function createInGrid(
    oid: number,
    scene: Game,
    col: number,
    row: number,
    cfg: ObstacleConfig,
    callback?: (entity: ObstacleEntity) => void,
  ) {
    const { x } = PositionManager.Instance.getPlantBottomCenter(col, row);
    create(oid, scene, x, row, cfg, callback);
  }

  export function create(
    oid: number,
    scene: Game,
    x: number,
    row: number,
    cfg: ObstacleConfig,
    callback?: (entity: ObstacleEntity) => void,
  ) {
    DeferredManager.Instance.defer(() => {
      const model = ObstacleLibrary.GetModel(oid);
      if (!model) return;

      const col = Phaser.Math.Clamp(
        PositionManager.Instance.getColByX(x),
        0,
        PositionManager.Instance.Col_Number - 1,
      );
      const finalRow = Phaser.Math.Clamp(row, 0, PositionManager.Instance.Row_Number - 1);
      const entity = model.createEntity(scene, col, finalRow, cfg);
      if (callback) callback(entity);
    });
  }
}

export default ObstacleCmd;
