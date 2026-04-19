import { PlantStat } from "../../../../utils/numbervalue";
import PlantsManager from "../../../managers/combat/PlantsManager";
import ResourceManager from "../../../managers/combat/ResourceManager";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import { BaseEntity } from "../../../models/core/BaseEntity";
import { PlantCmd } from "../../../utils/cmd/PlantCmd";


export class GeneratorModel extends PlantModel {
  public override pid = 8;
  public override nameKey = 'name_generator';
  public override descriptionKey = 'generator_description';
  public override texturePath = 'plant/generator';

  public maxHealth = new PlantStat(800).setIncRatio(1.2);
  public cost = new PlantStat(50);
  public cooldown = new PlantStat(32000); // 32秒
  public cooldownStartAtRatio = 0.7;
  public damage = new PlantStat(0); // 生成器没有伤害

  // 夜间植物标记
  isNightPlant = true;

  onHurt(entity: GeneratorEntity, damage: number, realDamage: number, dealer?: BaseEntity): void {
    // 累计伤害，每20点伤害产生能量
    entity.damagedSum += damage;
    let energyToAdd = 0;

    while (entity.damagedSum >= 20) {
      entity.damagedSum -= 20;

      // 根据等级和睡眠状态计算产生的能量
      let energy = 5;
      if (entity.isSleeping) {
        // 睡眠时产能减少
        // 1-4级: 3能量
        // 5-8级: 4能量
        // 9+级: 6能量
        energy = (entity.level >= 5) ? (entity.level >= 9 ? 6 : 4) : 3;
      } else {
        // 清醒时产能更多
        // 1-8级: 5能量
        // 9+级: 8能量
        energy = (entity.level >= 9) ? 8 : 5;
      }
      energyToAdd += energy;
    }

    // 通过 ResourceManager 更新全体能量
    if (energyToAdd > 0) {
      ResourceManager.Instance.UpdateEnergy(energyToAdd, 'all');
      entity.playGenerateAnimation();
    }
  }

  onStarShards(entity: GeneratorEntity): void {
    if (entity.currentHealth <= 0) return;

    // 唤醒自己和周围3x3范围内的所有队友
    for (let i = entity.col - 1; i <= entity.col + 1; i++) {
      for (let j = entity.row - 1; j <= entity.row + 1; j++) {
        // 检查坐标是否合法
        const gridWidth = PositionManager.Instance.Col_Number || 10;
        const gridHeight = PositionManager.Instance.Row_Number || 5;

        if (i >= 0 && i < gridWidth && j >= 0 && j < gridHeight) {
          const key = `${i}-${j}`;
          const plantList = PlantsManager.Instance.PlantsMap.get(key);
          if (plantList) {
            for (const plant of plantList) {
              // ✅ 使用 PlantCmd.SetSleeping 确保状态变化被正确延迟处理
              PlantCmd.SetSleeping(plant, false);
            }
          }
        }
      }
    }

    // 恢复自己的血量
    PlantCmd.SetHealth(entity, entity.maxHealth);
    entity.playAwakAnimation();
  }

  public createEntity(scene: Game, col: number, row: number, level: number) {
    return new GeneratorEntity(scene, col, row, level);
  }
}

export class GeneratorEntity extends PlantEntity {
  // 运行时状态：用于伤害累积
  public damagedSum: number = 0;

  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, GeneratorData, level);
    this.damagedSum = 0;
  }

  protected buildView() {
    const size = PositionManager.Instance.getPlantDisplaySize();

    const sprite = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(size.sizeX, size.sizeY)
      .setDepth(this.baseDepth);

    this.viewGroup.add(sprite);
  }

  public playGenerateAnimation() {
    const sprite = this.viewGroup.getChildren()[0] as Phaser.GameObjects.Sprite;
    if (!sprite) return;

    // 简单的闪烁动画：切换到第二帧表示发光
    sprite.setFrame(1);

    // 使用 scene.time 处理动画时序（表现层）
    this.scene.time.delayedCall(300, () => {
      if (this && this.currentHealth && this.currentHealth > 0) {
        sprite.setFrame(0);
      }
    });
  }

  public playAwakAnimation() {
    const sprite = this.viewGroup.getChildren()[0] as Phaser.GameObjects.Sprite;
    if (!sprite) return;

    // 唤醒动画：快速闪烁两次
    sprite.setFrame(1);
    this.scene.time.delayedCall(100, () => {
      if (sprite) sprite.setFrame(0);
    });
    this.scene.time.delayedCall(200, () => {
      if (sprite) sprite.setFrame(1);
    });
    this.scene.time.delayedCall(300, () => {
      if (sprite) sprite.setFrame(0);
    });
  }
}

export const GeneratorData = new GeneratorModel();