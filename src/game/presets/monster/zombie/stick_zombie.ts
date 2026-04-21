import type { Game } from "../../../scenes/Game";
import { PositionManager } from "../../../managers/view/PositionManager";
import { BaseZombieEntity, PresetMonsterModel, addHandAttachment } from "../../../models/entities/MonsterEntity";


export class StickZombieEntity extends BaseZombieEntity {
  private hasStick = true;
  private vaultTargetX = 0;

  public constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID);
    addHandAttachment(this, "attach/hd_stick");
  }

  public override startAttacking(target: any) {
    if (this.hasStick && target && typeof target.col === "number") {
      this.hasStick = false;
      this.isFlying = true;
      this.vaultTargetX = PositionManager.Instance.getGridTopLeft(target.col, this.row).x - PositionManager.Instance.GRID_SIZEX * 0.25;
      this.setVelocityX(-this.originalSpeed * 2.2);
      return;
    }
    if (this.isFlying) return;
    super.startAttacking(target);
  }

  public override stepUpdate(): void {
    super.stepUpdate();
    if (!this.isFlying || this.x > this.vaultTargetX) return;
    this.finishVault();
  }

  public override updateView(vec: { x: number; y: number; }): void {
    super.updateView(vec);
    if (this.isFlying) {
      this.animController.updatePosition(this.x + this.offsetX, this.y + this.offsetY - PositionManager.Instance.GRID_SIZEY * 0.4);
    }
  }

  private finishVault() {
    this.isFlying = false;
    this.speed = this.originalSpeed * 0.5;
    this.attachSprites.get("attach/hd_stick")?.setVisible(false);
    this.startMove();
  }
}

export const StickZombieData = new PresetMonsterModel({
  mid: 8,
  nameKey: "StickZombie",
  level: 2,
  weight: () => 2000,
  leastWaveID: 9,
  maxHealth: 300,
  baseSpeed: 40,
  attackDamage: 30,
  createEntity: (scene, col, row, model, waveID) => new StickZombieEntity(scene, col, row, model, waveID),
});
