
import DepthUtils from "../../../utils/depth";
import { PositionManager } from "../../managers/view/PositionManager";
import type { Game } from "../../scenes/Game";
import { CombatEntity } from "../core/CombatEntity";
import { ProjectileEntity } from "../entities/ProjectileEntity";
import { Faction } from "../Enum";
import { ExplosionConfig, LaserConfig, LaserModel } from "./ProjectileModels";

export class LaserEntity extends ProjectileEntity<LaserModel> {
  public baseDepth: number;

  constructor(scene: Game, x1: number, y1: number, x2: number, y2: number, model: LaserModel,
    row: number, cfg: LaserConfig) {
    // 计算中点作为中心
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;

    super(scene, centerX, centerY, model, cfg);
    this.currentDamage = cfg.damage;

    const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    const height = PositionManager.Instance.GRID_SIZEY * 0.6;

    // 创建旋转的矩形视觉对象
    const rect = scene.add.rectangle(centerX, centerY, distance, height, model.color, cfg.alphaFrom);
    rect.setRotation(angle);
    this.baseDepth = DepthUtils.getProjectileDepth('laser', row);
    rect.setDepth(this.baseDepth);
    this.viewGroup.add(rect);

    // 创建旋转的物理碰撞 Sensor
    this.createSensor(distance, height, angle);

    // 处理视觉与生命周期
    if (cfg.invisible) {
      rect.setAlpha(0);
      scene.time.delayedCall(105, () => this.destroy());
    } else {
      scene.musical.shootLaserPool.play();
      scene.tweens.add({
        targets: rect,
        alpha: cfg.alphaTo,
        duration: cfg.duration,
        onComplete: () => this.destroy()
      });
    }
  }

  buildView() { }

  protected applyEffect(target: CombatEntity): void {
    this.hasAttacked.add(target);
    target.takeDamage(this.currentDamage, this.dealer, this);

    // debuff
    if (this.debuff) {
      target.addDebuff(this.debuff, this.debuffDuration);
    }
  }
}