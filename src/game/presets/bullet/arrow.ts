import { PositionManager } from "../../managers/view/PositionManager";
import { BulletEntity } from "../../models/projectiles/BulletEntity";
import { BulletConfig, BulletModel } from "../../models/projectiles/ProjectileModels";
import { Game } from "../../scenes/Game";
import { _TypeArrowEnhancement, EnhancementPriority } from "../../../constants/game";
import { CombatEntity } from "../../models/core/CombatEntity";
import { ProjectileCmd } from "../../utils/cmd/ProjectileCmd";

export interface ArrowConfig extends BulletConfig {
  enhancement?: _TypeArrowEnhancement;
}

export class ArrowModel extends BulletModel<ArrowConfig, ArrowEntity> {
  texture = 'bullet/arrow';
  public createEntity(scene: Game, x: number, row: number, config: ArrowConfig): ArrowEntity {
    return new ArrowEntity(scene, x, row, this, config);
  }
}

export const ArrowData = new ArrowModel();

export class ArrowEntity extends BulletEntity {
  // 附魔相关属性
  private enhancement: _TypeArrowEnhancement = 'none';
  private trail: Phaser.GameObjects.Sprite | null = null;

  constructor(scene: Game, col: number, row: number, model: ArrowModel, cfg: ArrowConfig) {
    super(scene, col, row, model, cfg);

    // 1. 覆盖默认的视觉缩放 (宽度翻倍，高度减半)
    const size = PositionManager.Instance.getBulletDisplaySize();
    this.sprite.setDisplaySize(size.sizeX * 2, size.sizeY / 2);

    // 2. 播放专属音效
    scene.musical.shootArrowPool.play();

    // 3. 初始化附魔动画
    if (cfg.enhancement && cfg.enhancement !== 'none') {
      this.catchEnhancement(cfg.enhancement);
    }
  }

  // 实现附魔方法：建立或更新附魔动画
  public catchEnhancement(newEnhancement: _TypeArrowEnhancement): void {
    const scene = this.scene;
    if (!scene) return;

    // 1. 动画定义（仅首次）
    if (!scene.anims.exists('fire_trail')) {
      scene.anims.create({
        key: 'fire_trail',
        frames: scene.anims.generateFrameNumbers('anime/fire', { start: 0, end: 31 }),
        duration: 1000,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('lightning_trail')) {
      scene.anims.create({
        key: 'lightning_trail',
        frames: scene.anims.generateFrameNumbers('anime/lightning_trail', { start: 0, end: 7 }),
        duration: 1000,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('ice_trail')) {
      scene.anims.create({
        key: 'ice_trail',
        frames: scene.anims.generateFrameNumbers('anime/ice_trail', { start: 0, end: 7 }),
        duration: 1000,
        repeat: -1,
      });
    }

    // 2. 如果新 enhancement 与当前一致，则无需重复处理
    // 2.5 判断enhancement的优先级，如果原先的优先级更高，那么也无需处理
    if (this.enhancement === newEnhancement ||
      EnhancementPriority(this.enhancement, newEnhancement)) {
      return;
    }

    // 3. 旧 trail 淡出并销毁
    if (this.trail) {
      scene.tweens.add({
        targets: this.trail,
        alpha: 0,
        duration: 800,
        ease: 'Linear',
        onComplete: () => this.trail?.destroy(),
      });
      this.trail = null;
    }

    this.enhancement = newEnhancement;
    const trailDepth = this.baseDepth + 1;
    const fadeDur = 100;

    // 4. 新 trail 淡入
    switch (this.enhancement) {
      case 'fire': {
        const spr = scene.add.sprite(this.x, this.y, 'anime/fire')
          .setScale(PositionManager.Instance.scaleFactor)
          .setOrigin(0.5, 1)
          .setDepth(trailDepth)
          .setAlpha(0)
          .play('fire_trail');

        spr.anims.timeScale = 0.5;
        // 将尾迹加入 viewGroup，这样会自动跟随实体位置更新
        this.viewGroup.add(spr);

        scene.tweens.add({
          targets: spr,
          alpha: 1,
          duration: fadeDur,
          ease: 'Linear',
        });

        this.trail = spr;
        break;
      }
      case 'lightning': {
        const img = scene.add.sprite(this.x, this.y, 'anime/lightning_trail')
          .setScale(PositionManager.Instance.scaleFactor)
          .setOrigin(0.5, 1)
          .setDepth(trailDepth)
          .setAlpha(0)
          .play('lightning_trail');

        // 将尾迹加入 viewGroup，这样会自动跟随实体位置更新
        this.viewGroup.add(img);

        scene.tweens.add({
          targets: img,
          alpha: 1,
          duration: fadeDur,
          ease: 'Linear',
        });
        this.trail = img;
        break;
      }
      case 'ice': {
        const img = scene.add.sprite(this.x, this.y, 'anime/ice_trail')
          .setScale(PositionManager.Instance.scaleFactor)
          .setOrigin(0.5, 1)
          .setDepth(trailDepth)
          .setAlpha(0)
          .play('ice_trail');

        // 将尾迹加入 viewGroup，这样会自动跟随实体位置更新
        this.viewGroup.add(img);

        scene.tweens.add({
          targets: img,
          alpha: 1,
          duration: fadeDur,
          ease: 'Linear',
        });
        this.trail = img;
        break;
      }
    }
  }

  // 重载 applyEffect 方法，生效 arrow 特殊附魔的逻辑
  protected applyEffect(t: CombatEntity): void {
    // 如果是 fire 附魔，提高伤害
    const originalDamage = this.currentDamage;
    if (this.enhancement === 'fire') {
      this.currentDamage = Math.floor(this.currentDamage * 1.5);
    }

    // 调用父类逻辑处理基本伤害和穿透
    super.applyEffect(t);

    // 恢复伤害值
    this.currentDamage = originalDamage;

    // 如果有 ice 效果，施加 slow debuff
    if (this.enhancement === 'ice') {
      t.addDebuff('slow', 5000);
    }
  }



  // 销毁时清理尾迹和处理 lightning 爆炸
  destroy(): void {
    const scene = this.scene;

    // 如果被附魔了 lightning，销毁时会爆炸
    if (scene && this.enhancement === 'lightning') {
      const currentRow = PositionManager.Instance.getRowByY(this.y);

      ProjectileCmd.CreateExplosion(scene, this.x, currentRow, {
        damage: Math.ceil(this.currentDamage / 4),
        rightGrid: 1,
        leftGrid: 1,
        upGrid: 1,
        faction: this.faction,
        dealer: this.dealer,
      })
    }

    // 清理尾迹（viewGroup 会在 super.destroy() 中统一销毁）
    this.trail = null;

    super.destroy();
  }
}

// ========================================
// MutantYAxisArrow - 可以沿Y轴运动到目标行的箭矢
// ========================================

/**
 * MutantYAxisArrow 配置
 * 当箭矢到达指定 targetRow 时，取消 Y 方向速度，只向前移动
 */
export interface MutantYAxisArrowConfig extends ArrowConfig {
  targetRow?: number; // 目标行，默认为起始行
  ySpeed?: number;    // Y 方向速度，单位：像素/帧
}

export class MutantYAxisArrowModel extends ArrowModel {
  public override texture = 'bullet/arrow';

  public createEntity(scene: Game, x: number, row: number, config: MutantYAxisArrowConfig): MutantYAxisArrowEntity {
    return new MutantYAxisArrowEntity(scene, x, row, this, config);
  }
}

export const MutantYAxisArrowData = new MutantYAxisArrowModel();

export class MutantYAxisArrowEntity extends ArrowEntity {
  private targetRow: number;
  private targetY: number;
  private ySpeed: number;
  /**
   * 方向标志：true 表示向上超越某个 row（即 row 小于 targetRow）
   *           false 表示向下
   */
  private lowerOrUpper: boolean;

  constructor(scene: Game, col: number, row: number, model: MutantYAxisArrowModel, cfg: MutantYAxisArrowConfig) {
    super(scene, col, row, model, cfg);

    // 初始化目标行
    this.targetRow = cfg.targetRow ?? row;
    const { y } = PositionManager.Instance.getBulletCenter(col, this.targetRow);
    this.targetY = y;

    // 确定方向：是否向上
    this.lowerOrUpper = this.targetRow < row;

    // 设置 Y 方向速度
    this.ySpeed = cfg.ySpeed ?? 200;
    if (this.ySpeed > 0) {
      this.ySpeed = this.ySpeed * PositionManager.Instance.scaleFactor;
    }

    // 设置初始 Y 速度
    if (this.rigidBody) {
      const currentVel = this.rigidBody.linvel();
      const newYVel = this.lowerOrUpper ? -this.ySpeed : this.ySpeed;
      this.rigidBody.setLinvel({ x: currentVel.x, y: newYVel }, true);
    }
  }

  public override stepUpdate() {
    // 检查是否到达目标 row
    if (this.rigidBody) {
      if (this.lowerOrUpper) {
        // 向上模式：检查是否到达或超过目标Y
        if (this.y <= this.targetY) {
          this.rigidBody.setLinvel({ x: this.rigidBody.linvel().x, y: 0 }, true);
          this.y = this.targetY;
        }
      } else {
        // 向下模式：检查是否到达或超过目标Y
        if (this.y >= this.targetY) {
          this.rigidBody.setLinvel({ x: this.rigidBody.linvel().x, y: 0 }, true);
          this.y = this.targetY;
        }
      }
    }

    // 调用父类的 stepUpdate
    super.stepUpdate();
  }
}