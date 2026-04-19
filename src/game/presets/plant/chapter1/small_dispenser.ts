import ProjectileDamage from "../../../../constants/damage";
import { PlantStat } from "../../../../utils/numbervalue";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import createShootBurstAnim from "../../../sprite/shoot_anim";
import { PlantCmd } from "../../../utils/cmd/PlantCmd";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import CombatHelper from "../../../utils/helper/CombatHelper";
import { SnowBallData, SnowBallModel, BombSnowBallModel } from "../../bullet/snowball";

export class FireBallModel extends BombSnowBallModel {
  public override texture = 'bullet/fireball';
}

export const FireBallData = new FireBallModel();

export class SmallDispenserModel extends PlantModel {
  public override pid = 5;
  public override nameKey = 'name_small_dispenser';
  public override descriptionKey = 'small_dispenser_description';
  public override texturePath = 'plant/small_dispenser';

  public maxHealth = new PlantStat(300);
  public cost = new PlantStat(0);

  public cooldown = new PlantStat(10000);
  public cooldownStartAtRatio = 1;

  public damage = new PlantStat(ProjectileDamage.bullet.snowBall).setIncRatio(1.3);
  public isNightPlant = true;
  public isTiny = true;

  public override createEntity(scene: Game, col: number, row: number, level: number): SmallDispenserEntity {
    return new SmallDispenserEntity(scene, col, row, level);
  }

  public override onCreate(entity: SmallDispenserEntity): void {
    // 精英2, 白天不睡觉
    if (entity.level >= 9) {
      PlantCmd.SetSleeping(entity, false);
    }

    let maxDistanceGrid = 3.6;
    if (entity.level >= 5) {
      maxDistanceGrid = 5.6;
    }

    entity.tickmanager.addEvent({
      startAt: 500,
      delay: 1000,
      loop: true,
      callback: () => {
        if (entity.isSleeping || entity.currentHealth <= 0) return;

        if (CombatHelper.HasEnemyFactionOnRowInDistance(entity.faction, entity.GetRow(), entity.x, 0, maxDistanceGrid)) {
          entity.playShootAnimation();

          ProjectileCmd.Create<SnowBallModel>(SnowBallData, entity.scene, entity.x, entity.row, {
            damage: this.damage.getValueAt(entity.level),
            maxDistance: maxDistanceGrid * PositionManager.Instance.GRID_SIZEX,
            faction: entity.faction,
            dealer: entity
          });
        }
      }
    });
  }

  public override onStarShards(entity: SmallDispenserEntity): void {
    if (entity.isSleeping) {
      PlantCmd.SetSleeping(entity, false);
    }

    const dmg = new PlantStat(ProjectileDamage.bullet.bomb_fireBall).setIncRatio(1.2).getValueAt(entity.level);

    ProjectileCmd.Create<FireBallModel>(FireBallData, entity.scene, entity.x, entity.row, {
      damage: dmg,
      maxDistance: PositionManager.Instance.GRID_SIZEY * 12,
      faction: entity.faction,
      dealer: entity
    });
  }
}

export const SmallDispenserData = new SmallDispenserModel();

export class SmallDispenserEntity extends PlantEntity {
  private mainSprite!: Phaser.GameObjects.Sprite;

  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, SmallDispenserData, level);
  }

  protected override buildView() {
    const size = PositionManager.Instance.getPlantDisplaySize();

    this.mainSprite = this.scene.add.sprite(this.x, this.y, this.model.texturePath)
      .setOrigin(0.5, 1)
      .setDisplaySize(size.sizeX, size.sizeY)
      .setDepth(this.baseDepth);

    this.viewGroup.add(this.mainSprite);
  }

  public playShootAnimation() {
    if (this.currentHealth <= 0) return;

    // original logic uses width*1/3, height/7
    const width = this.mainSprite.displayWidth;
    const height = this.mainSprite.displayHeight;

    createShootBurstAnim(
      this.scene,
      this.x + width * (1 / 3),
      this.y - height / 7,
      16,
      this.baseDepth + 1
    );
  }
}
