import { PlantStat } from "../../../../utils/numbervalue";
import PlantsManager from "../../../managers/combat/PlantsManager";
import GridManager from "../../../managers/combat/GridManager";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import { PlantCmd } from "../../../utils/cmd/PlantCmd";


export class LilyModel extends PlantModel {
  public override pid = 6;
  public override nameKey = 'name_lily';
  public override descriptionKey = 'lily_description';
  public override texturePath = 'plant/lily';

  public maxHealth = new PlantStat(300).setIncRatio(2);
  public cost = new PlantStat(25).setThreshold(5, 0); // 5级以上无需能量
  public cooldown = new PlantStat(4000);
  public cooldownStartAtRatio = 0.7;
  public damage = new PlantStat(0); // Lily没有伤害

  isNightPlant = false;

  onStarShards(entity: LilyEntity): void {
    if (entity.currentHealth <= 0) return;

    const scene = entity.scene as Game;

    // 在周围3x3的水地形上种植Lily
    for (let i = entity.col - 1; i <= entity.col + 1; i++) {
      for (let j = entity.row - 1; j <= entity.row + 1; j++) {
        // 检查坐标合法性
        if (i < 0 || i >= PositionManager.Instance.Col_Number ||
          j < 0 || j >= PositionManager.Instance.Row_Number) {
          continue;
        }

        // 跳过自己
        if (i === entity.col && j === entity.row) {
          continue;
        }

        // 检查是否为水地形
        const gridProp = GridManager.Instance.GetGridProperty(i, j);
        if (!gridProp || gridProp.type !== 'water') {
          continue;
        }

        // 检查该位置是否已有Lily
        const key = `${i}-${j}`;
        let hasLily = false;
        const plantList = PlantsManager.Instance.PlantsMap.get(key);
        if (plantList) {
          for (const plant of plantList) {
            if (plant.pid === this.pid) {
              hasLily = true;
              break;
            }
          }
        }

        // 如果没有Lily，则种植一个
        if (!hasLily) {
          PlantCmd.Create<LilyModel>(LilyData, scene, i, j, entity.level);
        }
      }
    }
  }

  public createEntity(scene: Game, col: number, row: number, level: number) {
    return this.initializeEntity(new LilyEntity(scene, col, row, level));
  }
}

export class LilyEntity extends PlantEntity {
  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, LilyData, level);
  }

  protected buildView() {
    const size = PositionManager.Instance.getPlantDisplaySize();

    const sprite = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(size.sizeX, size.sizeY)
      .setDepth(this.baseDepth - 2); // Lily的深度比其他植物低2层

    this.viewGroup.add(sprite);
  }
}

export const LilyData = new LilyModel();
