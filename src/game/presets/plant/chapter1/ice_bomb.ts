import { PlantStat } from "../../../../utils/numbervalue";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";


export class IceBombModel extends PlantModel {
  public override pid = 12;
  public override nameKey = 'name_ice_bomb';
  public override descriptionKey = 'ice_bomb_description';
  public override texturePath = 'plant/ice_bomb';

  public maxHealth = new PlantStat(600);
  public cost = new PlantStat(75).setThreshold(5, 100);
  public cooldown = new PlantStat(52000).setThreshold(9, 41000); // 52秒 / 9级时41秒
  public cooldownStartAtRatio = 1; // 需要完整等待cooldown

  // 初始化伤害：1-4级 15伤害 * 2倍 = 30；5级以上 350伤害
  public damage = new PlantStat(15).setIncRatio(2).setThreshold(5, 350);

  isNightPlant = true;

  constructor() {
    super();

  }

  onCreate(entity: IceBombEntity): void {
    // 立即发射激光
    if (!entity.isSleeping) {
      this.shootLaser(entity);
    }
  }

  onSleepStateChange(entity: IceBombEntity, isSleeping: boolean): void {
    // 从睡眠中唤醒时立即发射
    if (!isSleeping) {
      this.shootLaser(entity);
    }
  }

  onStarShards(entity: IceBombEntity): void {
    // 星辰碎片触发时立即发射
    this.shootLaser(entity);
  }

  private shootLaser(entity: IceBombEntity): void {
    if (!entity.scene || entity.currentHealth <= 0) return;

    const scene = entity.scene as Game;
    const damageValue = this.damage.getValueAt(entity.level);

    // 触发视觉效果
    entity.playFreezeAnimation();

    // 第一次攻击：500ms后发射冻结激光
    entity.tickmanager.delayedCall({
      delay: 500,
      callback: () => {
        if (!entity || entity.currentHealth <= 0) return;

        entity.setVisible(false);
        console.log('frozen laser');

        // 发射隐藏的冻结激光到所有行
        for (let row = 0; row < PositionManager.Instance.Row_Number; row++) {
          ProjectileCmd.CreateLaser(
            scene, -1 * PositionManager.Instance.GRID_SIZEX, row, {
            damage: damageValue,
            duration: 5000,
            distance: 12,
            debuff: 'frozen',
            debuffDuration: 5000,
            couldAttackFlying: true,
            invisible: true,
            color: 0x00ffff,
            alphaFrom: 0,
            alphaTo: 0,
            faction: entity.faction,
          });
        }
      }
    });

    // 第二次攻击：5000ms后发射减速激光
    entity.tickmanager.delayedCall({
      delay: 5000,
      callback: () => {
        if (!entity || entity.currentHealth <= 0) return;

        // 发射隐藏的减速激光到所有行
        for (let row = 0; row < PositionManager.Instance.Row_Number; row++) {
          ProjectileCmd.CreateLaser(
            scene, -1 * PositionManager.Instance.GRID_SIZEX, row, {
            damage: damageValue,
            duration: 5000,
            distance: 12,
            debuff: 'slow',
            debuffDuration: 5000,
            couldAttackFlying: true,
            invisible: true,
            color: 0x00ffff,
            alphaFrom: 0,
            alphaTo: 0,
            faction: entity.faction,
          });

        }

        // 销毁自身
        entity.destroy();
      }
    });
  }

  public createEntity(scene: Game, col: number, row: number, level: number) {
    return this.initializeEntity(new IceBombEntity(scene, col, row, level));
  }
}

export class IceBombEntity extends PlantEntity {
  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, IceBombData, level);
    // 播放冻结音效
    scene.musical.plantAudio.play('freeze');
  }

  protected buildView() {
    const size = PositionManager.Instance.getPlantDisplaySize();

    const sprite = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(size.sizeX, size.sizeY)
      .setDepth(this.baseDepth);

    this.viewGroup.add(sprite);
  }

  public playFreezeAnimation() {
    // 创建蓝色冰晶矩形散射效果
    const posManager = PositionManager.Instance;
    const depth = this.baseDepth + 1;
    const centerX = this.x;
    const centerY = this.y - posManager.GRID_SIZEY / 2;

    const rangeWidth = posManager.GRID_SIZEX * 1.5;   // 横向散布范围
    const rangeHeight = posManager.GRID_SIZEY * 1.5;  // 纵向散布范围
    const rectWidth = posManager.GRID_SIZEX / 15;     // 小矩形宽度
    const rectHeight = posManager.GRID_SIZEX / 15;    // 小矩形高度
    const rectCount = 20;                             // 矩形数量

    for (let i = 0; i < rectCount; i++) {
      // 在范围内随机生成小矩形的中心坐标
      const posX = Phaser.Math.Between(centerX - rangeWidth / 2, centerX + rangeWidth / 2);
      const posY = Phaser.Math.Between(centerY - rangeHeight / 2, centerY + rangeHeight / 2);

      // 创建图形对象并绘制蓝色矩形
      const graphics = this.scene.add.graphics({ fillStyle: { color: 0x0265b6 } }).setDepth(depth);
      graphics.fillRect(posX - rectWidth / 2, posY - rectHeight / 2, rectWidth, rectHeight);

      // Tween动画：透明度从1渐变到0.2，同时缓慢消失
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

export const IceBombData = new IceBombModel();
