/**
 * 发光粉 - 即时效果植物，唤醒同格器械并创建视觉效果
 */

import { PlantStat } from "../../../../utils/numbervalue";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import PlantHelper from "../../../utils/helper/PlantHelper";

const SECKILL = 99889988; // 秒杀血量

export class GlowPowderModel extends PlantModel {
  public override pid = 17;
  public override nameKey = 'name_glow_powder';
  public override descriptionKey = 'glow_powder_description';
  public override texturePath = 'plant/glow_powder';

  public maxHealth = new PlantStat(SECKILL);
  public cost = new PlantStat(75).setThreshold(5, 50);
  public cooldown = new PlantStat(14000).setDecValue(0.6);
  public cooldownStartAtRatio = 0;
  public damage = new PlantStat(0);
  public isNightPlant = false;

  public override createEntity(scene: Game, col: number, row: number, level: number): GlowPowderEntity {
    return new GlowPowderEntity(scene, col, row, level);
  }

  public override onCreate(entity: GlowPowderEntity): void {
    // 唤醒同一格的所有其他器械
    entity.awakePlantsInGrid();

    // 创建视觉效果
    entity.createVisualEffect();

    // 300ms 后销毁自己
    entity.scene.time.delayedCall(300, () => {
      if (entity.currentHealth > 0) {
        entity.destroy();
      }
    });
  }
}

export const GlowPowderData = new GlowPowderModel();

export class GlowPowderEntity extends PlantEntity {
  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, GlowPowderData, level);
  }

  protected override buildView() {
    // GlowPowder 是即时效果植物，无需可见的精灵
    // 但为了保持架构一致性，可以创建一个不可见的占位符
  }

  /**
   * 唤醒同一格的所有植物
   */
  public awakePlantsInGrid(): void {
    const plants = PlantHelper.GetPlantsInGrid(this.col, this.row);
    for (const plant of plants) {
      // 不唤醒自己
      if (plant === this) continue;
      plant.setSleeping(false);
    }
  }

  /**
   * 创建黄色矩形散布的视觉效果
   */
  public createVisualEffect(): void {
    const depth = this.baseDepth + 1;
    const centerX = this.x;
    const centerY = this.y - PositionManager.Instance.GRID_SIZEY / 2;
    const rangeWidth = PositionManager.Instance.GRID_SIZEX;
    const rangeHeight = PositionManager.Instance.GRID_SIZEY;
    const rectWidth = PositionManager.Instance.GRID_SIZEX / 15;
    const rectHeight = PositionManager.Instance.GRID_SIZEX / 15;
    const rectCount = 15;

    for (let i = 0; i < rectCount; i++) {
      // 在范围内随机生成小矩形的中心坐标
      const posX = Phaser.Math.Between(
        centerX - rangeWidth / 2,
        centerX + rangeWidth / 2
      );
      const posY = Phaser.Math.Between(
        centerY - rangeHeight / 2,
        centerY + rangeHeight / 2
      );

      // 创建黄色矩形
      const graphics = this.scene.add.graphics({
        fillStyle: { color: 0xFFFF5A }
      }).setDepth(depth);

      graphics.fillRect(
        posX - rectWidth / 2,
        posY - rectHeight / 2,
        rectWidth,
        rectHeight
      );

      // Tween：透明度在 1600ms 内从 1 衰减到 0.2，然后销毁
      this.scene.tweens.add({
        targets: graphics,
        alpha: 0.2,
        duration: 1600,
        ease: 'Linear',
        onComplete: () => {
          graphics.destroy();
        }
      });
    }
  }
}

export default GlowPowderData;