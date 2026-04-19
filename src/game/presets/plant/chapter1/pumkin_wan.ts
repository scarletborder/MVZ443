import { PlantStat } from "../../../../utils/numbervalue";
import ProjectileDamage from "../../../../constants/damage";
import PlantsManager from "../../../managers/combat/PlantsManager";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import { Faction } from "../../../models/Enum";
import { PumpkinData } from "./pumkin";
import CombatHelper from "../../../utils/helper/CombatHelper";
import { ExplosionConfig, LaserConfig } from "../../../models/projectiles/ProjectileModels";
import { PlantCmd } from "../../../utils/cmd/PlantCmd";

/**
 * 南瓜头·晚上 - 夜间激光植物的升级版
 * 
 * 特点：
 * - 升级版南瓜头，替换基座植物
 * - 攻击更快，范围更近
 * - 发射三束激光（上、中、下）
 * - 7级以上激光能攻击飞行单位
 * - 星屑能力发射连续爆炸
 */
export class PumpkinWanModel extends PlantModel {
  public override pid = 11;
  public override nameKey = 'name_pumpkin_wan';
  public override descriptionKey = 'pumpkin_wan_description';
  public override texturePath = 'plant/pumpkin_wan';

  public maxHealth = new PlantStat(400).setIncRatio(1);
  public cost = new PlantStat(325).setThreshold(5, 275).setThreshold(7, 300);
  public cooldown = new PlantStat(52000).setThreshold(9, 58000);
  public cooldownStartAtRatio = 0; // 不需要初始冷却

  public damage = new PlantStat(ProjectileDamage.laser.heavy_laser).setIncRatio(1.35);
  public isNightPlant = true;

  // 攻击参数
  private readonly attackDistance = new PlantStat(3).setThreshold(9, 5); // 格子数（比基础版短）
  private readonly startOffset = new PlantStat(1.5).setThreshold(9, 2.5); // 格子数
  private readonly baseAttackInterval = new PlantStat(1550); // 毫秒（比基础版短）

  // 激光参数
  private readonly laserDuration = 550; // 激光持续时间

  onCreate(entity: PumpkinWanEntity): void {
    // 设置最大血量和当前血量
    entity.maxHealth = this.maxHealth.getValueAt(entity.level);
    entity.currentHealth = entity.maxHealth;
    entity.updateDisplayFrame();

    // 启动周期性激光发射
    const attackInterval = this.baseAttackInterval.getValueAt(entity.level);

    entity.tickmanager.addEvent({
      startAt: attackInterval / 2, // 第一次攻击延迟
      delay: attackInterval,
      repeat: -1,
      callback: () => {
        if (entity.isSleeping) return;

        // 根据等级调整范围
        const startOffset = this.startOffset.getValueAt(entity.level);

        // 检查三行任意有敌人
        if (
          CombatHelper.HasEnemyFactionOnRowInDistance(
            entity.faction,
            entity.row - 1,
            entity.x,
            startOffset,
            startOffset
          ) ||
          CombatHelper.HasEnemyFactionOnRowInDistance(
            entity.faction,
            entity.row,
            entity.x,
            startOffset,
            startOffset
          ) ||
          CombatHelper.HasEnemyFactionOnRowInDistance(
            entity.faction,
            entity.row + 1,
            entity.x,
            startOffset,
            startOffset
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

  onSleepStateChange(_entity: PumpkinWanEntity, _isSleeping: boolean): void {
    // 定时器会在 callback 中检查 isSleeping 状态，无需手动维护
  }

  onStarShards(entity: PumpkinWanEntity): void {
    if (entity.currentHealth <= 0) return;

    // 触发连续爆炸大招
    this.bruteShot(entity.scene, entity);
  }

  /**
   * 普通发射：三束激光
   */
  private normalShot(scene: Game, entity: PumpkinWanEntity): void {
    const level = entity.level;
    const damage = this.damage.getValueAt(level);

    // 根据等级调整激光起始位置和距离
    const startOffset = this.startOffset.getValueAt(level);
    const laserDistance = this.attackDistance.getValueAt(level);
    const canAttackFlying = level >= 7;

    const startX = entity.x - startOffset * PositionManager.Instance.GRID_SIZEX;

    // 向上、中、下三行发射激光
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
      const targetRow = entity.row + rowOffset;
      if (targetRow >= 0 && targetRow < PositionManager.Instance.getRowCount()) {
        const laserConfig: LaserConfig = {
          damage,
          faction: entity.faction,
          dealer: entity,
          duration: this.laserDuration,
          distance: laserDistance,
          couldAttackFlying: canAttackFlying,
        };

        ProjectileCmd.CreateLaser(scene, startX, targetRow, laserConfig);
      }
    }
  }

  /**
   * 大招：连续爆炸
   */
  private bruteShot(scene: Game, entity: PumpkinWanEntity): void {
    const totalExplosions = 5;
    const initialDelay = 1800;

    entity.playBruteShootAnimation(totalExplosions);

    entity.tickmanager.addEvent({
      startAt: initialDelay,
      delay: 2000,
      repeat: totalExplosions - 1,
      callback: () => {
        if (entity.currentHealth > 0) {
          const damage = 275;
          const explosionConfig: ExplosionConfig = {
            damage,
            faction: entity.faction,
            dealer: entity,
            upGrid: 1,
            leftGrid: 1.5,
            rightGrid: 1.5,
          };

          ProjectileCmd.CreateExplosion(
            scene,
            entity.x,
            entity.row,
            explosionConfig
          );
        }
      }
    });
  }

  public createEntity(scene: Game, col: number, row: number, level: number): PumpkinWanEntity {
    // 替换基座的阴森南瓜头（如果存在）
    const key = `${col}-${row}`;
    const plants = PlantsManager.Instance.PlantsMap.get(key) || [];
    let isSleeping = true;
    for (const plant of plants) {
      if (plant.pid === PumpkinData.pid) {
        isSleeping = plant.isSleeping;
        // 销毁基座植物
        plant.destroy();
        break;
      }
    }

    const entity = new PumpkinWanEntity(scene, col, row, level);
    PlantCmd.SetSleeping(entity, isSleeping); // 继承睡眠状态
    return entity;
  }
}

/**
 * PumpkinWanEntity - 南瓜头·晚上的实体表现层
 */
export class PumpkinWanEntity extends PlantEntity {
  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, PumpkinWanData, level);
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

    // 550ms 后恢复帧
    this.scene.time.delayedCall(550, () => {
      if (this && this.currentHealth > 0 && sprite) {
        sprite.setFrame(0);
      }
    });
  }

  /**
   * 大招动画（爆炸发射时）
   */
  public playBruteShootAnimation(_totalExplosions: number): void {
    const sprite = this.viewGroup.getChildren()[0] as Phaser.GameObjects.Sprite;
    if (!sprite) return;

    // 头部向左缩进
    this.scene.tweens.add({
      targets: sprite,
      x: this.x - sprite.displayWidth * 0.1,
      duration: 200,
      ease: 'Sine.easeOut'
    });

    // 总持续时间：1800 + 2000 * 4 = 9800ms
    const totalDuration = 1800 + 2000 * 4;
    this.scene.time.delayedCall(totalDuration, () => {
      if (sprite && this.currentHealth > 0) {
        this.scene.tweens.add({
          targets: sprite,
          x: this.x,
          duration: 200,
          ease: 'Sine.easeIn'
        });
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

export const PumpkinWanData = new PumpkinWanModel();
