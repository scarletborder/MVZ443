import ProjectileDamage from "../../../../constants/damage";
import { PlantStat } from "../../../../utils/numbervalue";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import { Game } from "../../../scenes/Game";
import createShootBurstAnim from "../../../sprite/shoot_anim";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import CombatHelper from "../../../utils/helper/CombatHelper";
import { ArrowConfig, ArrowData, ArrowEntity, ArrowModel } from "../../bullet/arrow";


export class DispenserModel extends PlantModel {
  public override pid = 1;
  public override nameKey = 'name_dispenser';
  public override descriptionKey = 'dispenser_description';
  public override texturePath = 'plant/dispenser';

  public maxHealth = new PlantStat(300);
  public cost = new PlantStat(100).setThreshold(5, 75);
  public cooldown = new PlantStat(6000);
  public cooldownStartAtRatio = 0; // 不需要等待，立即装填

  public damage = new PlantStat(ProjectileDamage.bullet.arrow).setIncRatio(1.35);
  public penetrate = new PlantStat(1).setThreshold(3, 2).setThreshold(5, 3); // 原代码逻辑：>=3变为2，星辰大招时特殊处理

  isNightPlant = false;

  onCreate(entity: DispenserEntity): void {
    // 启动普通发射定时器
    entity.tickmanager.addEvent({
      startAt: 800,
      delay: 1000,
      repeat: -1,
      callback: () => {
        if (entity.isSleeping) return;
        if (entity.inBruteShoot) return; // 暴力发射中不执行普通发射逻辑
        if (CombatHelper.HasEnemyFactionOnRow(entity.faction, entity.GetRow())) {
          entity.playShootAnimation();
          entity.tickmanager.delayedCall({
            delay: 200,
            callback: () => {
              this.normalShot(entity.scene, entity);
            }
          })
        }
      }
    })
    // 启动普通发射动画
    entity.playShootAnimation();
  }

  onSleepStateChange(entity: DispenserEntity, isSleeping: boolean): void {
    // 不用手动维护动画，因为动画的播放条件已经绑定睡眠状态了
  }

  onStarShards(entity: DispenserEntity): void {
    if (entity.inBruteShoot) return; // 已经在暴力发射中，避免重复触发
    entity.inBruteShoot = true;
    // 暴力发射
    this.bruteShot(entity.scene, entity, () => {
      entity.inBruteShoot = false;
    });
  }

  protected normalShot(scene: Game, entity: DispenserEntity) {
    ProjectileCmd.Create<ArrowModel>(
      ArrowData, scene, entity.x, entity.row, {
      damage: this.damage.getValueAt(entity.level),
      faction: entity.faction,
      speed: 500,
      bounceable: true,
      dealer: entity,
    });
  }

  private bruteShot(scene: Game, entity: DispenserEntity, callback: () => void) {
    const totalArrows = 50; // 暴力发射的箭矢数量
    entity.playBruteShootAnimation(totalArrows);
    entity.tickmanager.addEvent({
      startAt: 200,
      delay: 50,
      repeat: totalArrows - 1,
      callback: () => {
        this.normalShot(scene, entity);
      }
    });
    // 计算总持续时间：Tween 200ms + Timer 发射的时长
    const overallDuration = 200 + 50 * (totalArrows - 1);
    entity.tickmanager.delayedCall({
      delay: overallDuration,
      callback: () => {
        callback();
      }
    });
  }

  public createEntity(scene: Game, col: number, row: number, level: number) {
    const vec = PositionManager.Instance.getPlantBottomCenter(col, row);
    return new DispenserEntity(scene, vec.x, vec.y, level);
  }
}

export class DispenserEntity extends PlantEntity {
  private headX: number = 0;
  private head!: Phaser.GameObjects.Sprite;

  inBruteShoot: boolean = false; // 是否处于暴力发射状态

  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, DispenserData, level);
  }

  protected buildView() {
    const size = PositionManager.Instance.getPlantDisplaySize();

    const base = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 1)
      .setOrigin(0.5, 1).setDisplaySize(size.sizeX, size.sizeY).setDepth(this.baseDepth - 1);

    const head = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 2)
      .setOrigin(0.5, 1).setDisplaySize(size.sizeX, size.sizeY).setDepth(this.baseDepth);

    this.headX = this.x;
    this.head = head;
    this.viewGroup.addMultiple([base, head]);
  }

  public playShootAnimation() {
    const head = this.head;
    const moveDistance = head.displayWidth * 0.15;
    const originalX = this.headX;

    this.scene.tweens.add({
      targets: head,
      x: originalX - moveDistance,
      duration: 200,
      yoyo: true, // 完美替代手写的回弹
      ease: 'Sine.easeInOut',
      onYoyo: () => {
        createShootBurstAnim(this.scene, head.x + head.displayWidth * 4 / 9, head.y - head.displayHeight * 2 / 3, 24, this.baseDepth + 2);
      }
    });
  }

  public playBruteShootAnimation(totalArrows: number) {
    const head = this.head;
    const moveDistance = head.displayWidth * 0.15;
    const originalX = this.head.x;

    // 头部向左缩进
    this.scene.tweens.add({ targets: head, x: originalX - moveDistance, duration: 200, ease: 'Sine.easeOut' });

    // 结束后恢复原位与普通攻击
    this.scene.time.delayedCall(200 + 50 * (totalArrows - 1), () => {
      if (this.currentHealth <= 0) return;
      this.scene.tweens.add({ targets: head, x: originalX, duration: 200, ease: 'Sine.easeIn' });
    });
  }
}

export const DispenserData = new DispenserModel();