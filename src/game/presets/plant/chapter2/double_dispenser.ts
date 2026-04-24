/**
 * 双头发射器 - 同时射出前方箭和后方烟花
 */

import ProjectileDamage from "../../../../constants/damage";
import { PlantStat } from "../../../../utils/numbervalue";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import createShootBurstAnim from "../../../sprite/shoot_anim";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import CombatHelper from "../../../utils/helper/CombatHelper";
import ShootHeadAnimationHelper from "../../../utils/helper/ShootHeadAnimationHelper";
import { ArrowData, ArrowModel } from "../../bullet/arrow";
import { HFireWorkData, HFireWorkModel } from "../../bullet/firework";

export class DoubleDispenserModel extends PlantModel {
  public override pid = 16;
  public override nameKey = 'name_double_dispenser';
  public override descriptionKey = 'double_dispenser_description';
  public override texturePath = 'plant/double_dispenser';

  public maxHealth = new PlantStat(300);
  public cost = new PlantStat(125);

  public cooldown = new PlantStat(10000);
  public cooldownStartAtRatio = 1;

  public damage = new PlantStat(ProjectileDamage.bullet.arrow).setIncRatio(1.3);
  public fireworkDamage = new PlantStat(150).setIncRatio(1.2);
  public isNightPlant = false;

  public override createEntity(scene: Game, col: number, row: number, level: number): DoubleDispenserEntity {
    return this.initializeEntity(new DoubleDispenserEntity(scene, col, row, level));
  }

  public override onCreate(entity: DoubleDispenserEntity): void {
    entity.tickmanager.addEvent({
      startAt: 600,
      delay: 900,
      loop: true,
      callback: () => {
        if (entity.isSleeping || entity.currentHealth <= 0) return;

        if (CombatHelper.HasEnemyFactionOnRow(entity.faction, entity.GetRow())) {
          entity.playShootAnimation();

          entity.tickmanager.delayedCall({
            delay: 200,
            callback: () => {
              this.shootNormal(entity);
            }
          });
        }
      }
    });
  }

  public override onStarShards(entity: DoubleDispenserEntity): void {
    const front = 35;
    const back = 5;
    const frontInterval = 50;

    // 计算发射间隔：每几发前方发一发后方
    const elapsed = Math.floor(front / back);
    let frontCount = 0;

    entity.tickmanager.addEvent({
      startAt: 200,
      delay: frontInterval,
      repeat: front - 1,
      callback: () => {
        if (entity.currentHealth <= 0) return;

        // 前方箭矢
        this.shootFrontArrow(entity, ProjectileDamage.bullet.arrow / 2);

        // 每 elapsed 发前方，发一发后方烟花
        if (frontCount % elapsed === 0) {
          this.shootBackFirework(entity);
        }
        frontCount++;
      }
    });

    // 计算总持续时间
    const overallDuration = 200 + frontInterval * front;
    entity.tickmanager.delayedCall({
      delay: overallDuration,
      callback: () => {
        if (entity.currentHealth > 0) {
          entity.resetHeadPosition();
        }
      }
    });
  }

  private shootNormal(entity: DoubleDispenserEntity): void {
    const baseDamage = this.damage.getValueAt(entity.level);

    // 同时射前方和后方
    this.shootFrontArrow(entity, baseDamage);
    this.shootBackArrow(entity, baseDamage);
  }

  private shootFrontArrow(entity: DoubleDispenserEntity, damage: number): void {
    // 前方箭矢1
    ProjectileCmd.Create<ArrowModel>(ArrowData, entity.scene, entity.x, entity.row, {
      damage: damage,
      maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
      faction: entity.faction,
      dealer: entity,
      penetratePower: 1
    });

    // Lv5+：100ms后再发一发
    if (entity.level >= 5) {
      entity.tickmanager.delayedCall({
        delay: 100,
        callback: () => {
          if (entity.currentHealth <= 0) return;
          ProjectileCmd.Create<ArrowModel>(ArrowData, entity.scene, entity.x, entity.row, {
            damage: damage,
            maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
            faction: entity.faction,
            dealer: entity,
            penetratePower: 1
          });
        }
      });
    }
  }

  private shootBackArrow(entity: DoubleDispenserEntity, damage: number): void {
    const reverseSpeed = -500; // 反向速度

    // 后方箭矢1（反向）
    ProjectileCmd.Create<ArrowModel>(ArrowData, entity.scene, entity.x, entity.row, {
      damage: damage,
      maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
      faction: entity.faction,
      dealer: entity,
      penetratePower: 1,
      speed: reverseSpeed
    });

    // 100ms后再发一发反向箭
    entity.tickmanager.delayedCall({
      delay: 100,
      callback: () => {
        if (entity.currentHealth <= 0) return;
        ProjectileCmd.Create<ArrowModel>(ArrowData, entity.scene, entity.x, entity.row, {
          damage: damage,
          maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
          faction: entity.faction,
          dealer: entity,
          penetratePower: 1,
          speed: reverseSpeed
        });
      }
    });

    // Lv9+：150ms后再发一发反向箭
    if (entity.level >= 9) {
      entity.tickmanager.delayedCall({
        delay: 150,
        callback: () => {
          if (entity.currentHealth <= 0) return;
          ProjectileCmd.Create<ArrowModel>(ArrowData, entity.scene, entity.x, entity.row, {
            damage: damage,
            maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
            faction: entity.faction,
            dealer: entity,
            penetratePower: 1,
            speed: reverseSpeed
          });
        }
      });
    }
  }

  private shootBackFirework(entity: DoubleDispenserEntity): void {
    const damage = this.fireworkDamage.getValueAt(entity.level);
    const reverseSpeed = -500; // 反向速度

    ProjectileCmd.Create<HFireWorkModel>(HFireWorkData, entity.scene, entity.x, entity.row, {
      damage: damage,
      maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
      faction: entity.faction,
      dealer: entity,
      penetratePower: 1,
      speed: reverseSpeed,
      explodeDamage: ProjectileDamage.bullet.firework_splash
    });
  }
}

export const DoubleDispenserData = new DoubleDispenserModel();

export class DoubleDispenserEntity extends PlantEntity {
  private declare base: Phaser.GameObjects.Sprite;
  private declare head: Phaser.GameObjects.Sprite;
  private declare headX: number;

  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, DoubleDispenserData, level);
  }

  protected override buildView() {
    const size = PositionManager.Instance.getPlantDisplaySize();
    const scaledSize = {
      sizeX: size.sizeX * 1.2,
      sizeY: size.sizeY * 1.2
    };

    // 底座：frame 1
    this.base = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 1)
      .setOrigin(0.5, 1)
      .setDisplaySize(scaledSize.sizeX, scaledSize.sizeY)
      .setDepth(this.baseDepth - 1);

    // 头部：frame 2
    this.head = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 2)
      .setOrigin(0.5, 1)
      .setDisplaySize(scaledSize.sizeX, scaledSize.sizeY)
      .setDepth(this.baseDepth);

    this.headX = this.head.x;
    this.viewGroup.addMultiple([this.base, this.head]);
  }

  public playShootAnimation() {
    if (this.currentHealth <= 0 || !this.head) return;

    const moveDistance = this.head.displayWidth * 0.15;

    ShootHeadAnimationHelper.playRecoil(
      this.scene,
      this.head,
      this.headX,
      moveDistance,
      () => {
        if (this.currentHealth <= 0 || !this.head) return;

        createShootBurstAnim(
          this.scene,
          this.head.x + this.head.displayWidth * 4 / 9,
          this.head.y - this.head.displayHeight * 2 / 3,
          24,
          this.baseDepth + 2
        );
      }
    );
  }

  public resetHeadPosition() {
    if (this.head && this.currentHealth > 0) {
      ShootHeadAnimationHelper.recover(this.scene, this.head, this.headX);
    }
  }
}

export default DoubleDispenserData;
