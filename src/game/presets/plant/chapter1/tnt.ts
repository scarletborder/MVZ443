import seedrandom from "seedrandom";
import { GetDecValue, GetIncValue, PlantStat } from "../../../../utils/numbervalue";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import { StartArc } from "../../../utils/arc";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import { Faction } from "../../../models/Enum";
import CombatManager from "../../../managers/CombatManager";

export class TntModel extends PlantModel {
  public override pid = 7;
  public override nameKey = 'name_tnt';
  public override descriptionKey = 'tnt_description';
  public override texturePath = 'plant/tnt';

  public maxHealth = new PlantStat(2000).setThreshold(1, 2000); // SECKILL 高血量
  public cost = new PlantStat(150);

  public cooldown = new PlantStat(50000).setIncRatio(0.85);
  public cooldownStartAtRatio = 1;

  public damage = new PlantStat(1400).setIncRatio(1.35);
  public isNightPlant = false;

  public override createEntity(scene: Game, col: number, row: number, level: number): TntEntity {
    return this.initializeEntity(new TntEntity(scene, col, row, level));
  }

  public override onCreate(entity: TntEntity): void {
    // 计算伤害值
    let baseDamage = this.damage.getValueAt(entity.level);
    if (entity.level >= 5) {
      baseDamage *= 1.3;
    }
    entity.explosionDamage = baseDamage;

    // 闪烁效果（表现层），使用 scene.time
    entity.scene.tweens.add({
      targets: entity.mainSprite,
      alpha: { from: 1, to: 0.2 },
      duration: 300,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut'
    });

    // 倒计时爆炸（游戏逻辑），使用 tickmanager
    entity.tickmanager.delayedCall({
      delay: 850,
      callback: () => {
        entity.primaryExplosion();
      }
    });

    entity.tickmanager.delayedCall({
      delay: 900,
      callback: () => {
        entity.destroy();
      }
    });
  }

  public override onStarShards(entity: TntEntity): void {
    if (!entity.game) return;

    const scene = entity.game;

    function getExplosionTargets(game: Game, col: number, row: number) {
      const targets: number[][] = [];
      if (col === PositionManager.Instance.Col_Number - 1) {
        // 最右边的列：在左侧生成爆炸
        if (row === 0) {
          targets.push([col - 2, row]);
          targets.push([col, row + 2]);
        } else if (row === PositionManager.Instance.Row_Number - 1) {
          targets.push([col - 2, row]);
          targets.push([col, row - 2]);
        } else {
          targets.push([col - 1, Math.max(row - 2, 0)]);
          targets.push([col - 1, Math.min(row + 2, PositionManager.Instance.Row_Number - 1)]);
        }
      } else {
        // 非最右边的列：向前生成爆炸
        const newCol = Math.min(col + 2, PositionManager.Instance.Col_Number - 1);
        if (row === 0) {
          targets.push([newCol, row]);
          targets.push([newCol, row + 2]);
        } else if (row === PositionManager.Instance.Row_Number - 1) {
          targets.push([newCol, row]);
          targets.push([newCol, row - 2]);
        } else {
          targets.push([newCol, Math.max(row - 2, 0)]);
          targets.push([newCol, Math.min(row + 2, PositionManager.Instance.Row_Number - 1)]);
        }
      }
      return targets;
    }

    // 生成爆炸效果
    const targets = getExplosionTargets(scene, entity.col, entity.row);
    targets.forEach(([targetCol, targetRow]) => {
      const { x, y } = PositionManager.Instance.getPlantBottomCenter(targetCol, targetRow);
      StartArc(scene, entity.x, entity.y, x, y, 'plant/tnt', 800, () => {
        ProjectileCmd.CreateExplosion(scene, x, targetRow, {
          damage: entity.explosionDamage,
          rightGrid: 1.5,
          leftGrid: 1.5,
          upGrid: 1,
          faction: entity.faction,
          dealer: entity
        });

        // 精英7+：延迟爆炸
        if (entity.level >= 7) {
          entity.tickmanager.delayedCall({
            delay: 3900,
            callback: () => {
              ProjectileCmd.CreateExplosion(scene, x, targetRow, {
                damage: entity.explosionDamage / 3,
                rightGrid: 1.5,
                leftGrid: 1.5,
                upGrid: 1,
                faction: entity.faction,
                dealer: entity
              });
            }
          });
        }
      });
    });

    // 中心延迟爆炸（精英7+）
    if (entity.level >= 7) {
      entity.tickmanager.delayedCall({
        delay: 4750,
        callback: () => {
          ProjectileCmd.CreateExplosion(scene, entity.x, entity.row, {
            damage: entity.explosionDamage / 3,
            rightGrid: 1.5,
            leftGrid: 1.5,
            upGrid: 1,
            faction: entity.faction,
            dealer: entity
          });
        }
      });
    }
  }
}

export const TntData = new TntModel();

export class TntEntity extends PlantEntity {
  public explosionDamage: number = 0;
  public random: seedrandom.PRNG;
  public game: Game;
  public declare mainSprite: Phaser.GameObjects.Sprite;

  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, TntData, level);
    this.random = seedrandom.alea(String(CombatManager.Instance.seed * 5));
    this.game = scene;
  }

  protected override buildView() {
    const size = PositionManager.Instance.getPlantDisplaySize();

    this.mainSprite = this.scene.add.sprite(this.x, this.y, this.model.texturePath)
      .setOrigin(0.5, 1)
      .setDisplaySize(size.sizeX, size.sizeY)
      .setDepth(this.baseDepth);

    this.viewGroup.add(this.mainSprite);
  }

  public primaryExplosion() {
    ProjectileCmd.CreateExplosion(this.scene, this.x, this.row, {
      damage: this.explosionDamage,
      rightGrid: 1.5,
      leftGrid: 1.5,
      upGrid: 1,
      faction: this.faction,
      dealer: this
    });
  }
}

export default TntData;
