import seedrandom from "seedrandom";
import { PhaserEventBus, PhaserEvents } from "../../../EventBus";
import { PositionManager } from "../../../managers/view/PositionManager";
import { createGolemAnimController } from "../../../models/monster/anims/LegacyMonsterAnimControllers";
import type { Game } from "../../../scenes/Game";
import { GolemAnimProps } from "../../../sprite/golem";
import MobCmd from "../../../utils/cmd/MobCmd";
import StageHelper from "../../../utils/helper/StageHelper";
import { BaseMonsterEntity, PresetMonsterModel } from "../../../models/entities/MonsterEntity";


export abstract class BaseGolemEntity extends BaseMonsterEntity {
  protected readonly random: seedrandom.PRNG;
  protected callCount = 0;

  protected constructor(scene: Game, col: number, row: number, model: PresetMonsterModel, waveID: number, seedFactor: number) {
    super(scene, col, row, model, waveID);
    this.random = seedrandom.alea(String((scene as any).seed * seedFactor));
    PhaserEventBus.emit(PhaserEvents.BossHealth, { health: 100 });
    scene.musical.coverCurrent("bgm1");

    this.tickmanager.delayedCall({
      delay: 2500,
      callback: () => this.beginLoop(),
    });
  }

  protected abstract createProps(): GolemAnimProps;
  protected abstract skill1(): void;
  protected abstract skill2(): void;
  protected abstract reposition(done: () => void): void;
  protected abstract getCallBase(): number;
  protected abstract getCastDelay(): number;
  protected abstract getRecoverDelay(): number;

  protected createAnimController() {
    return createGolemAnimController(this.scene, this.x, this.y, this.createProps());
  }

  public override takeDamage(amount: number): void {
    super.takeDamage(amount);
    if (this.currentHealth > 0) {
      MobCmd.EmitBossHealth(this);
    }
  }

  public override destroy(): void {
    PhaserEventBus.emit(PhaserEvents.BossHealth, { health: -1 });
    this.scene.musical.backToDump();
    super.destroy();
  }

  private beginLoop() {
    if (this.currentHealth <= 0) return;
    this.stopMove();
    this.animController.stopLegSwing();
    this.runCycle();
    this.callMob();
  }

  private runCycle() {
    this.runOneSkill(1, () => {
      this.runOneSkill(2, () => this.runCycle());
    });
  }

  private runOneSkill(skill: 1 | 2, done: () => void) {
    this.tickmanager.delayedCall({
      delay: this.getCastDelay(),
      callback: () => {
        if (this.currentHealth <= 0) return;
        this.animController.startArmSwing();
        if (skill === 1) this.skill1();
        if (skill === 2) this.skill2();

        this.tickmanager.delayedCall({
          delay: 3200,
          callback: () => {
            this.animController.stopArmSwing();
            this.tickmanager.delayedCall({
              delay: this.getRecoverDelay(),
              callback: () => this.reposition(done),
            });
          }
        });
      }
    });
  }

  private callMob() {
    const allowed = [1, 2, 3, 8, 5, 7, 9, 11, 14, 15, 16];
    const levelSum = this.getCallBase() + (this.callCount % 3) * 10;
    const records = StageHelper.generateBossWaveScript(levelSum, this.random, allowed, this.callCount);
    this.callCount++;

    const mids: number[] = [];
    for (const record of records) {
      for (let i = 0; i < record.count; i++) {
        mids.push(record.mid);
      }
    }
    Phaser.Utils.Array.Shuffle(mids);

    const spawnNext = () => {
      if (this.currentHealth <= 0 || mids.length === 0) return;
      const batch = Math.min(4 + Math.floor(this.random() * 4), mids.length);
      for (let i = 0; i < batch; i++) {
        const mid = mids.shift();
        if (mid === undefined) break;
        const row = Math.floor(this.random() * PositionManager.Instance.Row_Number);
        MobCmd.Spawn(mid, this.scene, PositionManager.Instance.Col_Number, row, -10);
      }
      if (mids.length > 0) {
        this.tickmanager.delayedCall({
          delay: 4500 + Math.floor(this.random() * 2500),
          callback: spawnNext,
        });
      }
    };

    spawnNext();
  }
}



