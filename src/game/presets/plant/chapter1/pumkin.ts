import ProjectileDamage from "../../../../constants/damage";
import { PlantStat } from "../../../../utils/numbervalue";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import { Game } from "../../../scenes/Game";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import { Faction } from "../../../models/Enum";
import CombatHelper from "../../../utils/helper/CombatHelper";
import { LaserConfig } from "../../../models/projectiles/ProjectileModels";

/**
 * 南瓜头 - 夜间激光植物
 * 
 * 特点：
 * - 夜间植物（只在夜晚活跃）
 * - 周期性发射激光攻击前方怪物
 * - 9级以上的激光有减速效果
 * - 星屑能力触发大招（Master Spark），向上中下三行发射激光
 */
export class PumpkinModel extends PlantModel {
  public override pid = 9;
  public override nameKey = 'name_pumpkin';
  public override descriptionKey = 'pumpkin_description';
  public override texturePath = 'plant/pumpkin';

  public maxHealth = new PlantStat(300);
  public cost = new PlantStat(100).setIncRatio(0); // 9级以上返回 150
  public cooldown = new PlantStat(16000);
  public cooldownStartAtRatio = 1;

  public damage = new PlantStat(42).setIncRatio(1.35); // 伤害在激光中定义
  public SparkDamage = new PlantStat(290).setIncRatio(1.3); // 大招伤害
  public isNightPlant = true;

  // 攻击参数
  private readonly attackDistance = 4.6; // 格子数
  private readonly baseAttackInterval = new PlantStat(1950).setDecValue(0.75); // 毫秒

  // 激光参数
  private readonly laserDistance = 4.6; // 激光长度（格子数）
  private readonly laserDuration = 750; // 激光持续时间（毫秒）
  private readonly masterSparkDistance = 12; // 大招激光长度
  private readonly masterSparkDuration = 1000; // 大招激光持续时间

  onCreate(entity: PumpkinEntity): void {
    // 设置最大血量和当前血量
    entity.maxHealth = this.maxHealth.getValueAt(entity.level);
    entity.currentHealth = entity.maxHealth;
    entity.updateDisplayFrame();

    // 启动周期性激光发射
    const attackInterval = this.baseAttackInterval.getValueAt(entity.level);

    entity.tickmanager.addEvent({
      startAt: attackInterval * 0.75, // 第一次攻击延迟
      delay: attackInterval,
      repeat: -1,
      callback: () => {
        if (entity.isSleeping) return;

        if (
          CombatHelper.HasEnemyFactionOnRowInDistance(
            entity.faction,
            entity.row,
            entity.x,
            0,
            this.attackDistance
          )
        ) {
          entity.playAttackAnimation();
          entity.tickmanager.delayedCall({
            delay: 100, // 动画播放中途发射
            callback: () => {
              this.normalShot(entity.scene, entity);
            }
          });
        }
      }
    });
  }

  onSleepStateChange(_entity: PumpkinEntity, _isSleeping: boolean): void {
    // 定时器会在 callback 中检查 isSleeping 状态，无需手动维护
  }

  onStarShards(entity: PumpkinEntity): void {
    if (entity.currentHealth <= 0) return;

    // 触发大招
    this.masterSpark(entity.scene, entity);
  }

  /**
   * 普通发射
   */
  private normalShot(scene: Game, entity: PumpkinEntity): void {
    const damage = this.damage.getValueAt(entity.level);
    const x = entity.x;
    const row = entity.row;

    // 基础激光配置
    const laserConfig: LaserConfig = {
      damage: damage,
      faction: entity.faction,
      dealer: entity,
      duration: this.laserDuration,
      distance: this.laserDistance,
    };

    // 9级以上添加减速效果
    if (entity.level >= 9) {
      laserConfig.debuff = 'slow';
      laserConfig.debuffDuration = 3000;
    }

    ProjectileCmd.CreateLaser(scene, x, row, laserConfig);
  }

  /**
   * 大招：向上、中、下三行发射激光
   */
  private masterSpark(scene: Game, entity: PumpkinEntity): void {
    const rowCount = PositionManager.Instance.getRowCount();
    const damage = this.SparkDamage.getValueAt(entity.level);
    const x = entity.x;

    // 播放大招动画
    entity.playMasterSparkAnimation();

    // 发射激光
    for (
      let i = Math.max(0, entity.row - 1);
      i <= Math.min(rowCount - 1, entity.row + 1);
      i++
    ) {
      const laserConfig: LaserConfig = {
        damage,
        faction: entity.faction,
        dealer: entity,
        duration: this.masterSparkDuration,
        distance: this.masterSparkDistance,
      };

      ProjectileCmd.CreateLaser(scene, x, i, laserConfig);
    }
  }

  public createEntity(scene: Game, col: number, row: number, level: number): PumpkinEntity {
    return new PumpkinEntity(scene, col, row, level);
  }
}

/**
 * PumpkinEntity - 南瓜头的实体表现层
 */
export class PumpkinEntity extends PlantEntity {
  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, PumpkinData, level);
    this.buildView();
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
   * 普通攻击动画（发射激光时）
   */
  public playAttackAnimation(): void {
    const sprite = this.viewGroup.getChildren()[0] as Phaser.GameObjects.Sprite;
    if (!sprite) return;

    sprite.setFrame(1);

    // 750ms 后恢复帧
    this.scene.time.delayedCall(750, () => {
      if (this && this.currentHealth > 0 && sprite) {
        sprite.setFrame(0);
      }
    });
  }

  /**
   * 大招动画与激光发射（Master Spark）
   */
  public playMasterSparkAnimation(): void {
    const sprite = this.viewGroup.getChildren()[0] as Phaser.GameObjects.Sprite;
    if (!sprite) return;

    // 设置发射帧
    sprite.setFrame(1);

    // 200ms 后恢复帧
    this.scene.time.delayedCall(200, () => {
      if (sprite && this.currentHealth > 0) {
        sprite.setFrame(0);
      }
    });
  }

  /**
   * 更新显示帧
   */
  public updateDisplayFrame(): void {
    const sprite = this.viewGroup.getChildren()[0] as Phaser.GameObjects.Sprite;
    if (!sprite) return;

    sprite.setFrame(this.currentHealth > 0 ? 0 : 0);
  }
}

export const PumpkinData = new PumpkinModel();
