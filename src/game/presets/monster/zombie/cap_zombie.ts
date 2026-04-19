import { BaseZombieArmorEntity, PresetMonsterModel } from "../../../models/entities/MonsterEntity";
import type { Game } from "../../../scenes/Game";

export class CapZombieEntity extends BaseZombieArmorEntity {
  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    this.createArmor({
      key: "attach/cap",
      maxHealth: 370,
      thresholds: [250, 125],
      hitSound: "leatherHit",
    });
  }
}

export const CapZombieData = new PresetMonsterModel({
  mid: 2,
  nameKey: "CapZombie",
  level: 2,
  weight: (waveID) => Math.max(800, 4000 - (waveID - 4) * 150),
  leastWaveID: 0,
  maxHealth: 300,
  baseSpeed: 20,
  attackDamage: 20,
  createEntity: (scene, col, row, model, waveID) => new CapZombieEntity(scene, col, row, model, waveID),
});
