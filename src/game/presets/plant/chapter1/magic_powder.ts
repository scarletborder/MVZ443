import { PlantStat } from "../../../../utils/numbervalue";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import { SfxCmd } from "../../../utils/cmd/SfxCmd";
import { PowderScatterSfx } from "../../../sfx/powder/PowderScatterSfx";

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
    return this.initializeEntity(new MagicPowderEntity(scene, col, row, level));
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

  public playPowderAnimation(): void {
    SfxCmd.Create(PowderScatterSfx, {
      scene: this.scene,
      x: this.x,
      y: this.y,
      depth: this.baseDepth + 1,
      color: 0x0265b6,
      count: 15,
    });
  }
}

// 导出单例数据
export const MagicPowderData = new MagicPowderModel();
