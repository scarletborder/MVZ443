/**
 * 弹性小兵 - 反弹敌方子弹，支持闪电增强
 */

import { PlantStat } from "../../../../utils/numbervalue";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import { CollisionContext } from "../../../types";
import { BulletEntity } from "../../../models/projectiles/BulletEntity";
import { ArrowEntity } from "../../bullet/arrow";

export class ElasticPutinModel extends PlantModel {
  public override pid = 15;
  public override nameKey = 'name_elastic_putin';
  public override descriptionKey = 'elastic_putin_description';
  public override texturePath = 'plant/elastic_putin';

  public maxHealth = new PlantStat(300);
  public cost = new PlantStat(100).setThreshold(3, 75);
  public cooldown = new PlantStat(8000);
  public cooldownStartAtRatio = 0;
  public damage = new PlantStat(0);
  public isNightPlant = true;

  public override createEntity(scene: Game, col: number, row: number, level: number): ElasticPutinEntity {
    return new ElasticPutinEntity(scene, col, row, level);
  }

  public override onCreate(entity: ElasticPutinEntity): void {
    // 弹性小兵是被动单位，无需周期性检查
  }

  public override onStarShards(entity: ElasticPutinEntity): void {
    // 唤醒（如果在睡眠）
    entity.setSleeping(false);

    // 激活闪电效果
    const duration = entity.level >= 7 ? 8000 : 5000;
    entity.activateLightning(duration);
  }
}

export const ElasticPutinData = new ElasticPutinModel();

export class ElasticPutinEntity extends PlantEntity {
  private isLightning: boolean = false;

  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, ElasticPutinData, level);
  }

  protected override buildView() {
    const size = PositionManager.Instance.getPlantDisplaySize();

    // frame 0
    const sprite = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(size.sizeX, size.sizeY)
      .setDepth(this.baseDepth);

    this.viewGroup.add(sprite);
  }

  /**
   * 碰撞事件处理：反弹子弹
   */
  public override onCollision(ctx: CollisionContext): void {
    // 只反弹 BulletEntity
    if (!(ctx.targetEntity instanceof BulletEntity)) return;

    const bullet = ctx.targetEntity as BulletEntity;

    // 只反弹自己的子弹
    if (bullet.faction !== this.faction) return;

    // 如果子弹不可反弹，则不反弹
    if (!bullet.bounceable) return;

    // 调用子弹的反弹方法
    bullet.reverseVelocityX();

    // 如果激活了闪电效果，为子弹施加增强
    if (this.isLightning && bullet instanceof ArrowEntity) {
      bullet.catchEnhancement('lightning');
    }
  }

  /**
   * 激活闪电效果，持续指定时间
   */
  public activateLightning(duration: number): void {
    this.isLightning = true;
    // TODO: 可在此处添加动画效果

    this.scene.time.delayedCall(duration, () => {
      if (this.currentHealth > 0) {
        this.isLightning = false;
        // TODO: 移除动画效果
      }
    });
  }

  public override destroy(): void {
    super.destroy();
  }
}

export default ElasticPutinData;