import { PlantStat } from "../../../../utils/numbervalue";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import { Game } from "../../../scenes/Game";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";

/**
 * 魔法粉 - 瞬间植物
 * 种植时立即发射激光并产生蓝色粉末特效，然后自动销毁
 */
export class MagicPowderModel extends PlantModel {
  public override pid = 10;
  public override nameKey = 'name_magic_powder';
  public override descriptionKey = 'magic_powder_description';
  public override texturePath = 'plant/magic_powder';

  public maxHealth = new PlantStat(9999); // 秒杀值，几乎无敌
  public cost = new PlantStat(175).setThreshold(5, 125);
  public cooldown = new PlantStat(55000).setThreshold(9, 48000); // 55秒 / 9级时48秒
  public cooldownStartAtRatio = 1; // 需要完整等待cooldown

  // 激光伤害：1-8级 1500，9级时提升到更高
  public damage = new PlantStat(1500).setThreshold(9, 2000);

  isNightPlant = false;

  onCreate(entity: MagicPowderEntity): void {
    // 立即发射激光和播放特效
    this.shootLaser(entity);
  }

  onStarShards(entity: MagicPowderEntity): void {
    // null effect
  }

  private shootLaser(entity: MagicPowderEntity): void {
    if (!entity.scene || entity.currentHealth <= 0) return;

    const scene = entity.scene as Game;
    const damageValue = this.damage.getValueAt(entity.level);

    // 播放粉末散射特效
    entity.playPowderAnimation();

    // 立即发射激光
    const rangeWidth = PositionManager.Instance.GRID_SIZEX; // 1格宽度
    ProjectileCmd.CreateLaser(
      scene,
      entity.col - 0.6, // 中心位置
      entity.row,
      {
        damage: damageValue,
        duration: 200,
        distance: 1.2,
        couldAttackFlying: true,
        invisible: true,
        color: 0x00ffff,
        alphaFrom: 0.2,
        alphaTo: 0.1,
        faction: entity.faction,
      }
    );

    // 300ms后销毁自身
    entity.tickmanager.delayedCall({
      delay: 300,
      callback: () => {
        if (entity && entity.currentHealth > 0) {
          entity.destroy();
        }
      }
    });
  }

  public createEntity(scene: Game, col: number, row: number, level: number): MagicPowderEntity {
    return new MagicPowderEntity(scene, col, row, level);
  }
}

/**
 * MagicPowderEntity - 魔法粉的实体表现层
 */
export class MagicPowderEntity extends PlantEntity {
  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, MagicPowderData, level);
    // 播放音效
    if (scene.musical && scene.musical.plantAudio) {
      scene.musical.plantAudio.play('magic');
    }
  }

  protected buildView(): void {
    const size = PositionManager.Instance.getPlantDisplaySize();

    const sprite = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(size.sizeX, size.sizeY)
      .setDepth(this.baseDepth);

    this.viewGroup.add(sprite);
  }

  /**
   * 播放魔法粉末散射特效
   * 生成15个蓝色矩形在植物周围散射
   */
  public playPowderAnimation(): void {
    const posManager = PositionManager.Instance;
    const depth = this.baseDepth + 1;
    const centerX = this.x;
    const centerY = this.y - posManager.GRID_SIZEY / 2;

    const rangeWidth = posManager.GRID_SIZEX;        // 横向散布范围
    const rangeHeight = posManager.GRID_SIZEY;       // 纵向散布范围
    const rectWidth = posManager.GRID_SIZEX / 15;    // 小矩形宽度
    const rectHeight = posManager.GRID_SIZEX / 15;   // 小矩形高度
    const rectCount = 15;                            // 矩形数量

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

      // 创建图形对象并绘制蓝色矩形
      const graphics = this.scene.add.graphics({
        fillStyle: { color: 0x0265b6 }
      }).setDepth(depth);

      graphics.fillRect(
        posX - rectWidth / 2,
        posY - rectHeight / 2,
        rectWidth,
        rectHeight
      );

      // Tween动画：透明度从1渐变到0.2，1600ms内完成
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

// 导出单例数据
export const MagicPowderData = new MagicPowderModel();