import { PositionManager } from "../../managers/view/PositionManager";
import { ObstacleModel } from "../../models/ObstacleModel";
import { ObstacleConfig, ObstacleEntity } from "../../models/entities/ObstacleEntity";
import type { Game } from "../../scenes/Game";

export class ObsidianObstacleModel extends ObstacleModel {
  public readonly oid = 1;
  public readonly nameKey = "ObsidianObstacle";
  public readonly texturePath = "zombie/mob_obsidian";

  public createEntity(scene: Game, col: number, row: number, config: ObstacleConfig): ObstacleEntity {
    return this.initializeEntity(new ObsidianObstacleEntity(scene, col, row, this, config));
  }
}

export class ObsidianObstacleEntity extends ObstacleEntity {
  protected buildView(): void {
    const size = PositionManager.Instance.getPlantDisplaySize();
    const sprite = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(size.sizeX, size.sizeY)
      .setDepth(this.baseDepth);

    this.viewGroup.add(sprite);
  }
}

export const ObsidianObstacleData = new ObsidianObstacleModel();
