import { PlantStat } from "../../../../utils/numbervalue";
import { DeferredManager } from "../../../managers/DeferredManager";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import { BaseEntity } from "../../../models/core/BaseEntity";
import { PlantCmd } from "../../../utils/cmd/PlantCmd";

/**
 * 黑曜石 - 护盾植物
 * 
 * 特点：
 * - 有基础血量和护盾血量两层防御
 * - 当有护盾时，优先减少护盾而不是基础血量
 * - 星屑能力可以恢复护盾和血量
 * - 根据护盾/血量状态显示不同的视觉帧
 */
export class ObsidianModel extends PlantModel {
  public override pid = 3;
  public override nameKey = 'name_obsidian';
  public override descriptionKey = 'obsidian_description';
  public override texturePath = 'plant/obsidian';

  public maxHealth = new PlantStat(4000).setIncRatio(1.4);
  public cost = new PlantStat(50);
  public cooldown = new PlantStat(32000).setThreshold(5, 24000); // 32秒 / 5级时24秒
  public cooldownStartAtRatio = 1; // 需要完整等待cooldown

  public damage = new PlantStat(0); // 黑曜石没有伤害
  public isNightPlant = false;

  // 护盾相关数据
  maxShieldHealth = 6000;

  onHurt(entity: ObsidianEntity, damage: number, _realDamage: number, _dealer?: BaseEntity): void {
    // 护盾衰减系数：9级为 0.8，其他为 1.0
    const shieldRatio = entity.level >= 9 ? 0.8 : 1.0;
    const actualDamage = damage * shieldRatio;

    // 如果护盾足以吸收伤害
    if (entity.shieldHealth > actualDamage) {
      // ✅ 使用 DeferredManager 更新护盾血量
      entity.updateShieldHealth(entity.shieldHealth - actualDamage);
    } else {
      // 护盾不足，先扣护盾的等量伤害
      const remainingDamage = damage - Math.ceil(entity.shieldHealth / shieldRatio);

      // ✅ 更新护盾为 0
      entity.updateShieldHealth(0);

      // 剩余伤害扣基础血量（使用 PlantCmd）
      if (remainingDamage > 0) {
        PlantCmd.SetHealth(entity, Math.max(0, entity.currentHealth - remainingDamage));
      }
    }

    // 更新显示帧
    entity.updateDisplayFrame();
  }

  onStarShards(entity: ObsidianEntity): void {
    if (entity.currentHealth <= 0) return;

    // 恢复护盾和血量
    entity.updateShieldHealth(this.maxShieldHealth);
    PlantCmd.SetHealth(entity, entity.maxHealth);
    entity.updateDisplayFrame();
    entity.playShieldActivateAnimation();
  }

  public createEntity(scene: Game, col: number, row: number, level: number): ObsidianEntity {
    return new ObsidianEntity(scene, col, row, level);
  }
}

/**
 * ObsidianEntity - 黑曜石的实体表现层
 */
export class ObsidianEntity extends PlantEntity {
  // 运行时护盾血量（独立于基础血量）
  public shieldHealth: number = 0;
  private shieldHealthMax: number = 6000;

  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, ObsidianData, level);

    // 初始化护盾（没有护盾）
    this.shieldHealth = 0;

    // 初始帧
    this.updateDisplayFrame();
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
   * 更新护盾血量 - 使用 DeferredManager 延迟处理
   * 
   * 这确保护盾血量变化在 post-update 阶段才被应用
   */
  public updateShieldHealth(newShieldHealth: number): void {
    DeferredManager.Instance.defer(() => {
      this.shieldHealth = Math.max(0, Math.min(newShieldHealth, this.shieldHealthMax));
    });
  }

  /**
   * 根据护盾/血量状态更新显示帧
   * 
   * 帧映射：
   * - 0: 无护盾，血量 > 66%
   * - 1: 无护盾，血量 33-66%
   * - 2: 无护盾，血量 < 33%
   * - 3: 有护盾，护盾 > 66%
   * - 4: 有护盾，护盾 33-66%
   * - 5: 有护盾，护盾 < 33%
   */
  public updateDisplayFrame(): void {
    const sprite = this.viewGroup.getChildren()[0] as Phaser.GameObjects.Sprite;
    if (!sprite) return;

    if (this.currentHealth <= 0) return;

    // 有护盾时的帧显示
    if (this.shieldHealth > 0) {
      if (this.shieldHealth > this.shieldHealthMax * (2 / 3)) {
        sprite.setFrame(3);
      } else if (this.shieldHealth > this.shieldHealthMax * (1 / 3)) {
        sprite.setFrame(4);
      } else {
        sprite.setFrame(5);
      }
    } else {
      // 无护盾时的帧显示
      if (this.currentHealth > this.maxHealth * (2 / 3)) {
        sprite.setFrame(0);
      } else if (this.currentHealth > this.maxHealth * (1 / 3)) {
        sprite.setFrame(1);
      } else {
        sprite.setFrame(2);
      }
    }
  }

  /**
   * 护盾激活动画 - 星屑能力触发时
   */
  public playShieldActivateAnimation(): void {
    const sprite = this.viewGroup.getChildren()[0] as Phaser.GameObjects.Sprite;
    if (!sprite) return;

    // 简单的闪烁动画：快速闪烁表示护盾激活
    sprite.setFrame(3);

    this.scene.time.delayedCall(150, () => {
      if (sprite) sprite.setFrame(4);
    });

    this.scene.time.delayedCall(300, () => {
      if (sprite) sprite.setFrame(3);
    });
  }
}

export const ObsidianData = new ObsidianModel();