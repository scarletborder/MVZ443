import { BaseZombieArmorEntity, PresetMonsterModel } from "../../../models/entities/MonsterEntity";
import { MonsterSpeed, ZombieAttackInterval } from "../../../../constants/game";


export class TurtleZombieEntity extends BaseZombieArmorEntity {
  private buffApplied = false;

  public constructor(scene: Phaser.Scene & any, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    this.createArmor({
      key: "attach/turtle",
      maxHealth: 370,
      thresholds: [250, 125],
      damageScale: 0.5,
      hitSound: "leatherHit",
    });
  }

  protected override onArmorBroken(): void {
    if (this.buffApplied) return;
    this.buffApplied = true;
    this.speed = this.originalSpeed * 2;
    if (!this.attacking && !this.isFrozen) {
      this.startMove();
    }
  }
}

export const TurtleZombieData = new PresetMonsterModel({
  mid: 14,
  nameKey: "TurtleZombie",
  level: 2,
  weight: () => 1200,
  leastWaveID: 4,
  maxHealth: 300,
  baseSpeed: MonsterSpeed.TurtleZombie,
  attackDamage: 20,
  attackInterval: ZombieAttackInterval.TurtleZombie,
  createEntity: (scene, col, row, model, waveID) => new TurtleZombieEntity(scene, col, row, model, waveID),
});
