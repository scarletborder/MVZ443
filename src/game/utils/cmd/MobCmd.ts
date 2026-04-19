import { PhaserEventBus, PhaserEvents } from "../../EventBus";
import { DeferredManager } from "../../managers/DeferredManager";
import { MonsterLibrary } from "../../managers/library/MonsterLibrary";
import PlantsManager from "../../managers/combat/PlantsManager";
import { PositionManager } from "../../managers/view/PositionManager";
import { MonsterEntity } from "../../models/entities/MonsterEntity";
import { Game } from "../../scenes/Game";

namespace MobCmd {
  export function Spawn(mid: number, scene: Game, col: number, row: number, waveID: number,
    callback?: (entity: MonsterEntity) => void) {
    DeferredManager.Instance.defer(() => {
      const model = MonsterLibrary.GetModel(mid);
      if (!model) return;
      const finalRow = Phaser.Math.Clamp(row, 0, PositionManager.Instance.Row_Number - 1);
      const en = model.createEntity(scene, col, finalRow, waveID);
      if (callback) callback(en);
    });
  }

  export function DamagePlantsArea(centerCol: number, centerRow: number, radiusX: number, radiusY: number, damage: number) {
    DeferredManager.Instance.defer(() => {
      for (let dx = -radiusX; dx <= radiusX; dx++) {
        for (let dy = -radiusY; dy <= radiusY; dy++) {
          const plants = scenePlantsAt(centerCol + dx, centerRow + dy);
          for (const plant of plants) {
            plant.takeDamage(damage);
          }
        }
      }
    });
  }

  // 对区域的全部植物造成伤害
  export function DamagePlantsInCells(cells: Array<{ col: number, row: number }>, damage: number) {
    DeferredManager.Instance.defer(() => {
      const visited = new Set<string>();
      for (const cell of cells) {
        const key = `${cell.col}-${cell.row}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const plants = scenePlantsAt(cell.col, cell.row);
        for (const plant of plants) {
          plant.takeDamage(damage);
        }
      }
    });
  }

  export function EmitBossHealth(entity: MonsterEntity) {
    PhaserEventBus.emit(PhaserEvents.BossHealth, {
      health: Math.max(0, Math.round(entity.currentHealth * 100 / entity.maxHealth)),
    });
  }

  function scenePlantsAt(col: number, row: number) {
    return [...(PlantsManager.Instance.PlantsMap.get(`${col}-${row}`) ?? [])];
  }
}

export default MobCmd;
