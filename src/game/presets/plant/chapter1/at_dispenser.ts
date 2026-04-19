import ProjectileDamage from "../../../../constants/damage";
import { PlantStat } from "../../../../utils/numbervalue";
import { DeferredManager } from "../../../managers/DeferredManager";
import PlantsManager from "../../../managers/combat/PlantsManager";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import createShootBurstAnim from "../../../sprite/shoot_anim";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import CombatHelper from "../../../utils/helper/CombatHelper";
import { HFireWorkConfig, HFireWorkData, HFireWorkEntity, HFireWorkModel } from "../../bullet/firework";
import { DispenserData } from "./dispenser";

// 特殊的星辰碎片烟花模型
export class ATAirHFireWorkModel extends HFireWorkModel {
  public override createEntity(scene: Game, x: number, row: number, config: HFireWorkConfig): ATAirHFireWorkEntity {
    return new ATAirHFireWorkEntity(scene, x, row, this, config);
  }
}
export const ATAirHFireWorkData = new ATAirHFireWorkModel();

export class ATAirHFireWorkEntity extends HFireWorkEntity {
  private customExplodeDamage: number;

  constructor(scene: Game, x: number, row: number, model: ATAirHFireWorkModel, cfg: HFireWorkConfig) {
    // 传入 explodeDamage: 0 来阻止基类触发默认的单次爆炸
    super(scene, x, row, model, { ...cfg, explodeDamage: 0 });
    this.customExplodeDamage = cfg.explodeDamage ?? 0;
  }

  public override destroy(): void {
    const scene = this.scene;

    if (scene && this.customExplodeDamage > 0) {
      const row = PositionManager.Instance.getRowByY(this.y);
      const gridGap = PositionManager.Instance.GRID_SIZEX * 1.5;

      const offsets = [
        { dx: 0, dr: 0 },
        { dx: gridGap, dr: 2 },
        { dx: -gridGap, dr: 2 },
        { dx: gridGap, dr: -2 },
        { dx: -gridGap, dr: -2 },
      ];

      for (const offset of offsets) {
        ProjectileCmd.CreateExplosion(scene, this.x + offset.dx, row + offset.dr, {
          damage: this.customExplodeDamage,
          rightGrid: 1.5,
          leftGrid: 1.5,
          upGrid: 1,
          faction: this.faction,
          dealer: this.dealer,
        });
      }
    }

    super.destroy();
  }
}

export class ATDispenserModel extends PlantModel {
  public override pid = 14;
  public override nameKey = 'name_at_dispenser';
  public override descriptionKey = 'at_dispenser_description';
  public override texturePath = 'plant/at_dispenser';

  public maxHealth = new PlantStat(450).setIncRatio(2);
  public cost = new PlantStat(450).setThreshold(5, 425);

  public cooldown = new PlantStat(60000).setThreshold(9, 48000);
  public cooldownStartAtRatio = 0.5;

  public damage = new PlantStat(ProjectileDamage.bullet.firework).setIncRatio(1.4);
  public isNightPlant: boolean = false;

  public override createEntity(scene: Game, col: number, row: number, level: number): ATDispenserEntity {
    // 首先获得当前格子中作为基座的 发射器植物并销毁它
    const key = `${col}-${row}`;
    const plants = PlantsManager.Instance.PlantsMap.get(key) || [];

    for (const plant of plants) {
      if (plant.model.pid === DispenserData.pid) { // 基座
        DeferredManager.Instance.defer(() => {
          plant.destroy();
        });
        break;
      }
    }
    return this.initializeEntity(new ATDispenserEntity(scene, col, row, level));
  }

  public override onCreate(entity: ATDispenserEntity): void {
    entity.tickmanager.addEvent({
      startAt: 2500,
      delay: 3550,
      repeat: -1,
      callback: () => {
        if (entity.isSleeping) return;

        if (CombatHelper.HasEnemyFactionOnRow(entity.faction, entity.GetRow())) {
          entity.playShootAnimation();
          entity.tickmanager.delayedCall({
            delay: 200,
            callback: () => {
              this.normalShot(entity);
            }
          });
        }
      }
    });
  }

  public override onSleepStateChange(entity: ATDispenserEntity, isSleeping: boolean): void { }

  public override onStarShards(entity: ATDispenserEntity): void {
    // 发射一颗高射烟花火箭
    ProjectileCmd.Create<ATAirHFireWorkModel>(ATAirHFireWorkData, entity.scene, entity.x, entity.row, {
      damage: 50,
      maxDistance: PositionManager.Instance.GRID_SIZEX * 4,
      faction: entity.faction,
      dealer: entity,
      explodeDamage: 300
    });
  }

  protected normalShot(entity: ATDispenserEntity) {
    ProjectileCmd.Create<HFireWorkModel>(HFireWorkData, entity.scene, entity.x, entity.row, {
      damage: this.damage.getValueAt(entity.level),
      maxDistance: PositionManager.Instance.GRID_SIZEX * 32,
      faction: entity.faction,
      dealer: entity,
      explodeDamage: ProjectileDamage.bullet.firework_splash
    });
  }
}

export const ATDispenserData = new ATDispenserModel();

export class ATDispenserEntity extends PlantEntity {
  private declare headX: number;
  private declare head: Phaser.GameObjects.Sprite;

  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, ATDispenserData, level);
  }

  protected override buildView() {
    const size = PositionManager.Instance.getPlantDisplaySize();

    // 底座：frame 1
    const base = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 1)
      .setOrigin(0.5, 1)
      .setDisplaySize(size.sizeX * 1.5, size.sizeY * 1.5)
      .setDepth(this.baseDepth - 1);

    // 头部：frame 2
    const head = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 2)
      .setOrigin(0.5, 1)
      .setDisplaySize(size.sizeX * 1.2, size.sizeY * 1.2)
      .setDepth(this.baseDepth);

    this.headX = this.x;
    this.head = head;
    this.viewGroup.addMultiple([base, head]);
  }

  public playShootAnimation() {
    if (this.currentHealth <= 0) return;

    const head = this.head;
    const moveDistance = head.displayWidth * 0.15;
    const originalX = this.headX;

    this.scene.tweens.add({
      targets: head,
      x: originalX - moveDistance,
      duration: 200,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onYoyo: () => {
        if (this.currentHealth <= 0) return;

        createShootBurstAnim(this.scene, head.x + head.displayWidth * 2 / 9, head.y - head.displayHeight * 2 / 3, 24, this.baseDepth + 2);
        createShootBurstAnim(this.scene, head.x + head.displayWidth * 3 / 9, head.y - head.displayHeight * 2 / 3, 24, this.baseDepth + 2);
        createShootBurstAnim(this.scene, head.x + head.displayWidth * 2 / 9, head.y - head.displayHeight * 1 / 3, 24, this.baseDepth + 2);
      }
    });
  }
}
