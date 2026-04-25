import PlantsManager from "../../../managers/combat/PlantsManager";
import seedrandom from "seedrandom";
import { GetDecValue, PlantStat } from "../../../../utils/numbervalue";
import { PositionManager } from "../../../managers/view/PositionManager";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { PlantModel } from "../../../models/PlantModel";
import type { Game } from "../../../scenes/Game";
import { SfxCmd } from "../../../utils/cmd/SfxCmd";
import { ArcSfx } from "../../../sfx/arc/ArcSfx";
import { DirtOutSfx } from "../../../sfx/dirt/DirtOutSfx";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import { Faction } from "../../../models/Enum";
import { CollisionContext } from "../../../types";
import CombatManager from "../../../managers/CombatManager";
import { DeferredManager } from "../../../managers/DeferredManager";
import { CombatEntity } from "../../../models/core/CombatEntity";
import { MonsterEntity } from "../../../models/entities/MonsterEntity";

export class TntMinesModel extends PlantModel {
  public override pid = 4;
  public override nameKey = 'name_tnt_mines';
  public override descriptionKey = 'tnt_mines_description';
  public override texturePath = 'plant/tnt_mines';

  public maxHealth = new PlantStat(400);
  public cost = new PlantStat(25);

  public cooldown = new PlantStat(30000).setThreshold(5, 25000);
  public cooldownStartAtRatio = 1;

  public damage = new PlantStat(1500);
  public isNightPlant = false;
  public isTiny = true;

  public override createEntity(scene: Game, col: number, row: number, level: number): TntMinesEntity {
    return this.initializeEntity(new TntMinesEntity(scene, col, row, level));
  }

  public override onCreate(entity: TntMinesEntity): void {
    const buriedTime = GetDecValue(15000, 0.8, entity.level);

    entity.tickmanager.addEvent({
      delay: buriedTime,
      loop: false,
      callback: () => {
        entity.wakeup();
      }
    });
  }

  public override onStarShards(entity: TntMinesEntity): void {
    if (entity.game) {
      // 立刻出土
      entity.wakeup();

      const scene = entity.game;
      let leftCount = entity.level >= 7 ? 3 : 2;

      // 记录目标位置
      const targetPositions: { x: number; y: number; col: number; row: number }[] = [];
      const usedRows = new Set<number>();
      const usedCols = new Set<number>();

      // 第一遍：保证分布在不同的行和列中
      for (let col = PositionManager.Instance.Col_Number - 1; col >= 0 && leftCount > 0; col--) {
        const rows = Array.from({ length: PositionManager.Instance.Row_Number }, (_, i) => i);
        rows.sort(() => entity.random() - 0.5);

        for (const row of rows) {
          if (leftCount <= 0) break;
          const key = `${col}-${row}`;
          if (PlantsManager.Instance?.PlantsMap.has(key)) {
            const list = PlantsManager.Instance?.PlantsMap.get(key);
            if (list && list.length > 0) continue;
          }
          if (usedRows.has(row) || usedCols.has(col)) continue;

          const { x: tmpx, y: tmpy } = PositionManager.Instance.getPlantBottomCenter(col, row);
          targetPositions.push({ x: tmpx, y: tmpy, col: col, row: row });

          leftCount--;
          usedRows.add(row);
          usedCols.add(col);
        }
      }

      // 第二遍：如果不足，放宽限制
      if (leftCount > 0) {
        for (let col = PositionManager.Instance.Col_Number - 1; col >= 0 && leftCount > 0; col--) {
          const rows = Array.from({ length: PositionManager.Instance.Row_Number }, (_, i) => i);
          rows.sort(() => entity.random() - 0.5);

          for (const row of rows) {
            if (leftCount <= 0) break;
            const key = `${col}-${row}`;
            if (PlantsManager.Instance?.PlantsMap.has(key)) {
              const list = PlantsManager.Instance?.PlantsMap.get(key);
              if (list && list.length > 0) continue;
            }
            const { x: tmpx, y: tmpy } = PositionManager.Instance.getPlantBottomCenter(col, row);
            if (targetPositions.some(pos => pos.x === tmpx && pos.y === tmpy)) continue;
            targetPositions.push({ x: tmpx, y: tmpy, col: col, row: row });

            leftCount--;
          }
        }
      }

      // 开始放置
      const arcDuration = 1000;
      for (const pos of targetPositions) {
        SfxCmd.Create(ArcSfx, {
          scene,
          x1: entity.x, y1: entity.y,
          x2: pos.x, y2: pos.y,
          texture: 'plant/tnt_mines',
          duration: arcDuration,
        });
        entity.tickmanager.delayedCall({
          delay: arcDuration,
          callback: () => {
            DeferredManager.Instance.defer(() => {
              const newMine = this.createEntity(scene, pos.col, pos.row, entity.level);
              newMine.wakeup();
            });
          }
        });
      }
    }
  }
}

export const TntMinesData = new TntMinesModel();

export class TntMinesEntity extends PlantEntity {
  public isBuried: boolean = true;
  public hasExploded: boolean = false;
  public random: seedrandom.PRNG;

  private declare buriedSprite: Phaser.GameObjects.Sprite;
  private declare mainSprite: Phaser.GameObjects.Sprite;
  private colliderZombie: Phaser.Physics.Arcade.Collider | null = null;
  public game: Game;

  constructor(scene: Game, col: number, row: number, level: number) {
    super(scene, col, row, TntMinesData, level);
    this.random = seedrandom.alea(String(CombatManager.Instance.seed * 3));
    this.game = scene;
  }

  protected override buildView() {
    const size = PositionManager.Instance.getPlantDisplaySize();

    // 埋藏状态：显示泥土
    this.buriedSprite = this.scene.add.sprite(this.x, this.y, 'anime/dirt_out', 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(size.sizeX, size.sizeY)
      .setDepth(this.baseDepth);

    // 主体：TNT 炸弹
    this.mainSprite = this.scene.add.sprite(this.x, this.y, this.model.texturePath, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(size.sizeX, size.sizeY)
      .setDepth(this.baseDepth)
      .setVisible(false);

    this.viewGroup.addMultiple([this.buriedSprite, this.mainSprite]);
  }

  public wakeup(): void {
    if (this.currentHealth > 0 && this.isBuried && this.game) {
      this.isBuried = false;

      this.buriedSprite.setVisible(false);
      SfxCmd.Create(DirtOutSfx, {
        scene: this.game,
        col: this.col,
        row: this.row,
        onComplete: () => this.mainSprite.setVisible(true),
      });
    }
  }

  public override onHurt(damage: number, realDamage: number, dealer?: any, source?: any): void {
    if (this.isBuried) {
      // 埋藏时受伤正常减血
      super.onHurt(damage, realDamage, dealer, source);
    } else {
      // 出土后立即爆炸
      this.explode();
    }
  }

  public override onCollision(ctx: CollisionContext): void {
    // 出土后与僵尸接触立即爆炸
    if (!this.isBuried && this.currentHealth > 0 && !this.hasExploded) {
      if (ctx.targetEntity instanceof CombatEntity &&
        ctx.targetEntity.faction !== this.faction
      ) {
        if (!(ctx.targetEntity instanceof MonsterEntity) ||
          (ctx.targetEntity.isFlying === false && ctx.targetEntity.isInVoid === false)) {
          this.explode();
        }
      }
    }
  }

  private explode() {
    if (this.hasExploded) return;
    this.hasExploded = true;

    const rightDistance = this.level >= 9 ? 1.5 : 1;
    ProjectileCmd.CreateExplosion(this.scene, this.x, this.row, {
      damage: 1500,
      rightGrid: rightDistance,
      leftGrid: 0.5,
      upGrid: 0,
      faction: this.faction,
      dealer: this
    });

    this.destroy();
  }
}

export default TntMinesData;
