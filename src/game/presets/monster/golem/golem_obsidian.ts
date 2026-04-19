import { SECKILL } from "../../../../../public/constants";
import ObstacleManager from "../../../managers/combat/ObstacleManager";
import PlantsManager from "../../../managers/combat/PlantsManager";
import { PositionManager } from "../../../managers/view/PositionManager";
import { Faction } from "../../../models/Enum";
import { ObsidianGolemAnimProps } from "../../../sprite/normal_golem";
import { StartArc } from "../../../utils/arc";
import MobCmd from "../../../utils/cmd/MobCmd";
import ObstacleCmd from "../../../utils/cmd/ObstacleCmd";
import { PlantCmd } from "../../../utils/cmd/PlantCmd";
import { ObsidianObstacleData } from "../../obstacle";
import { PresetMonsterModel } from "../common";
import { BaseGolemEntity } from "./shared";

export function createObsidianColumnBurst(entity: BaseGolemEntity, cols: number[]) {
  cols.forEach((col, index) => {
    entity.tickmanager.delayedCall({
      delay: 800 + index * 600,
      callback: () => {
        spawnObsidianObstacle(entity, col, entity.row, 300, 800 + index * 100);
      }
    });
  });
}

export function spawnObsidianObstacle(entity: BaseGolemEntity, col: number, row: number, hp: number, arcHeight = 200) {
  if (ObstacleManager.Instance.HasObstacle(col, row)) return;

  const { x, y } = PositionManager.Instance.getPlantBottomCenter(col, row);
  StartArc(entity.scene, entity.x, entity.y, x, y, "zombie/mob_obsidian", 1200, () => {
    ObstacleCmd.createInGrid(ObsidianObstacleData.oid, entity.scene, col, row, {
      hp,
      faction: Faction.ZOMBIE,
      summoner: entity,
    });

    const plants = PlantsManager.Instance.PlantsMap.get(`${col}-${row}`) ?? [];
    for (const plant of [...plants]) {
      PlantCmd.DealDamage(plant, SECKILL / 2, entity);
    }
  }, arcHeight);
}

export class ObsidianGolemEntity extends BaseGolemEntity {
  public constructor(scene: Phaser.Scene & any, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID, 7);
  }

  protected createProps() {
    return ObsidianGolemAnimProps;
  }

  protected getCallBase() {
    return 38;
  }

  protected getCastDelay() {
    return 7000;
  }

  protected getRecoverDelay() {
    return 2000;
  }

  protected skill1(): void {
    createObsidianColumnBurst(this, [7, 5, 3]);
  }

  protected skill2(): void {
    const rows = [...new Set([this.row, Math.max(0, this.row - 1), Math.min(PositionManager.Instance.Row_Number - 1, this.row + 1)])];
    for (const row of rows) {
      spawnObsidianObstacle(this, 6, row, 500, 250);
      MobCmd.Spawn(11, this.scene, 7, row, -10);
    }
  }

  protected reposition(done: () => void): void {
    this.getLegacyController()?.raw.highJump?.(120 * PositionManager.Instance.scaleFactor);
    this.tickmanager.delayedCall({
      delay: 1200,
      callback: () => {
        const newRow = Phaser.Math.Between(0, PositionManager.Instance.Row_Number - 1);
        const pos = PositionManager.Instance.getZombieBottomCenter(8, newRow);
        this.col = 8;
        this.row = newRow;
        this.rigidBody?.setTranslation(pos, true);
        this.animController.updatePosition(pos.x + this.offsetX, pos.y + this.offsetY);
        this.getLegacyController()?.raw.land?.();
        done();
      }
    });
  }

  // 技能逻辑
}

export const ObsidianGolemData = new PresetMonsterModel({
  mid: 12,
  nameKey: "ObsidianGolem",
  level: 999,
  weight: () => 0,
  leastWaveID: 0,
  rank: "elite",
  maxHealth: 12000,
  baseSpeed: 25,
  attackDamage: 50,
  attackInterval: 1200,
  createEntity: (scene, col, row, model, waveID) => new ObsidianGolemEntity(scene, col, row, model, waveID),
});
