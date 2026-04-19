import ProjectileDamage from "../../../../constants/damage";
import { PlantStat } from "../../../../utils/numbervalue";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import createShootBurstAnim from "../../../sprite/shoot_anim";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import CombatHelper from "../../../utils/helper/CombatHelper";
import { ArrowData, ArrowModel, MutantYAxisArrowData, MutantYAxisArrowModel } from "../../bullet/arrow";

export class TripleDispenserModel extends PlantModel {
  public override pid = 13;
  public override nameKey = 'name_triple_dispenser';
  public override descriptionKey = 'triple_dispenser_description';
  public override texturePath = 'plant/triple_dispenser';

  public maxHealth = new PlantStat(300);
  public cost = new PlantStat(325).setThreshold(9, 350);

  public cooldown = new PlantStat(10000);
  public cooldownStartAtRatio = 1;

  public damage = new PlantStat(ProjectileDamage.bullet.arrow).setIncRatio(1.35);
  public isNightPlant = false;

  public override createEntity(scene: Game, col: number, row: number, level: number): TripleDispenserEntity {
    return new TripleDispenserEntity(scene, col, row, level);
  }

  public override onCreate(entity: TripleDispenserEntity): void {
    entity.tickmanager.addEvent({
      startAt: 600,
      delay: 1200,
      loop: true,
      callback: () => {
        if (entity.isSleeping || entity.currentHealth <= 0) return;

        const scene = entity.scene;
        const hasEnemyInRange =
          CombatHelper.HasEnemyFactionOnRow(entity.faction, entity.GetRow() - 1) ||
          CombatHelper.HasEnemyFactionOnRow(entity.faction, entity.GetRow()) ||
          CombatHelper.HasEnemyFactionOnRow(entity.faction, entity.GetRow() + 1) ||
          CombatHelper.HasEnemyFactionOnRow(entity.faction, entity.GetRow());

        if (hasEnemyInRange) {
          entity.playShootAnimation();

          entity.tickmanager.delayedCall({
            delay: 200,
            callback: () => {
              this.shootArrows(entity, false);
            }
          });
        }
      }
    });
  }

  public override onStarShards(entity: TripleDispenserEntity): void {
    // 星辰碎片触发暴力发射
    const totalArrows = 10;

    entity.playBruteShootSequence(totalArrows);

    const overallDuration = 200 + 80 * (totalArrows - 1);
    entity.tickmanager.delayedCall({
      delay: overallDuration,
      callback: () => {
        // 暴力发射结束后，继续正常射击
        if (entity.currentHealth > 0) {
          entity.resetHeadPosition();
        }
      }
    });
  }

  private shootArrows(entity: TripleDispenserEntity, isBrute: boolean = false): void {
    const damage = this.damage.getValueAt(entity.level);
    const penetrate = 1;

    if (isBrute) {
      // 暴力散射：射向极上方和极下方
      const topRow = -5;
      const bottomRow = 8;
      for (let speed = 0; speed < 600; speed += 40) {
        ProjectileCmd.Create<MutantYAxisArrowModel>(MutantYAxisArrowData, entity.scene, entity.x, entity.row, {
          damage: damage / 2,
          maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
          targetRow: topRow,
          ySpeed: speed,
          faction: entity.faction,
          dealer: entity,
          penetratePower: penetrate
        });

        ProjectileCmd.Create<MutantYAxisArrowModel>(MutantYAxisArrowData, entity.scene, entity.x, entity.row, {
          damage: damage / 2,
          maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
          targetRow: bottomRow,
          ySpeed: speed,
          faction: entity.faction,
          dealer: entity,
          penetratePower: penetrate
        });
      }
      return;
    }

    // 中路箭
    ProjectileCmd.Create<ArrowModel>(ArrowData, entity.scene, entity.x, entity.row, {
      damage: damage,
      maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
      faction: entity.faction,
      dealer: entity,
      penetratePower: penetrate
    });

    // 精英3+：中路多一发
    if (entity.level >= 3) {
      ProjectileCmd.Create<ArrowModel>(ArrowData, entity.scene, entity.x, entity.row, {
        damage: damage,
        maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
        faction: entity.faction,
        dealer: entity,
        penetratePower: penetrate
      });
    }

    // 上路箭
    if (entity.row >= 1) {
      ProjectileCmd.Create<MutantYAxisArrowModel>(MutantYAxisArrowData, entity.scene, entity.x, entity.row, {
        damage: damage,
        maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
        targetRow: entity.row - 1,
        faction: entity.faction,
        dealer: entity,
        penetratePower: penetrate
      });

      // 精英9+：上路多一发
      if (entity.level >= 9) {
        ProjectileCmd.Create<MutantYAxisArrowModel>(MutantYAxisArrowData, entity.scene, entity.x, entity.row, {
          damage: damage,
          maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
          targetRow: entity.row - 1,
          faction: entity.faction,
          dealer: entity,
          penetratePower: penetrate
        });
      }
    }

    // 下路箭
    if (entity.row <= PositionManager.Instance.Row_Number - 2) {
      ProjectileCmd.Create<MutantYAxisArrowModel>(MutantYAxisArrowData, entity.scene, entity.x, entity.row, {
        damage: damage,
        maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
        targetRow: entity.row + 1,
        faction: entity.faction,
        dealer: entity,
        penetratePower: penetrate
      });

      // 精英9+：下路多一发
      if (entity.level >= 9) {
        ProjectileCmd.Create<MutantYAxisArrowModel>(MutantYAxisArrowData, entity.scene, entity.x, entity.row, {
          damage: damage,
          maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
          targetRow: entity.row + 1,
          faction: entity.faction,
          dealer: entity,
          penetratePower: penetrate
        });
      }
    }
  }
}

export const TripleDispenserData = new TripleDispenserModel();

export class TripleDispenserEntity extends PlantEntity {
  private base!: Phaser.GameObjects.Sprite;
  private head!: Phaser.GameObjects.Sprite;
  private headX: number = 0;
  public game: Game;

  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, TripleDispenserData, level);
    this.game = scene;
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
    const originalX = this.headX;

    this.scene.tweens.add({
      targets: this.head,
      x: originalX - moveDistance,
      duration: 200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (this.currentHealth <= 0 || !this.head) return;

        createShootBurstAnim(
          this.scene,
          this.head.x + this.head.displayWidth * 4 / 9,
          this.head.y - this.head.displayHeight * 2 / 3,
          24,
          this.baseDepth + 2
        );

        this.scene.tweens.add({
          targets: this.head,
          x: originalX,
          duration: 200,
          ease: 'Sine.easeIn',
          onComplete: () => {
            if (this.head && this.currentHealth > 0) {
              this.head.x = originalX;
            }
          }
        });
      }
    });
  }

  public playBruteShootSequence(totalArrows: number) {
    if (this.currentHealth <= 0 || !this.head) return;

    const moveDistance = this.head.displayWidth * 0.15;
    const originalX = this.headX;

    // 头部向左移动
    this.scene.tweens.add({
      targets: this.head,
      x: originalX - moveDistance,
      duration: 200,
      ease: 'Sine.easeOut'
    });

    // 定时发射箭
    this.tickmanager.addEvent({
      startAt: 200,
      delay: 80,
      repeat: totalArrows - 1,
      callback: () => {
        if (this.currentHealth <= 0) return;
        (this.model as TripleDispenserModel)['shootArrows'](this, true);
      }
    });

    // 发射结束后头部回弹
    const overallDuration = 200 + 80 * (totalArrows - 1);
    this.scene.time.delayedCall(overallDuration, () => {
      if (this.currentHealth > 0 && this.head) {
        this.scene.tweens.add({
          targets: this.head,
          x: originalX,
          duration: 200,
          ease: 'Sine.easeIn'
        });
      }
    });
  }

  public resetHeadPosition() {
    if (this.head) {
      this.head.x = this.headX;
    }
  }
}

export default TripleDispenserData;
