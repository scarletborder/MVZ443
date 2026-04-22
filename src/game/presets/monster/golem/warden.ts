import { PositionManager } from "../../../managers/view/PositionManager";
import { PresetMonsterModel } from "../../../models/entities/MonsterEntity";
import { Faction } from "../../../models/Enum";
import { WardenGolemAnimProps } from "../../../sprite/normal_golem";
import MobCmd from "../../../utils/cmd/MobCmd";
import { ProjectileCmd } from "../../../utils/cmd/ProjectileCmd";
import { MonsterSpeed } from "../../../../constants/game";
import { BaseGolemEntity } from "./shared";

function createWardenLaser(entity: BaseGolemEntity) {
  ProjectileCmd.CreateLaser(entity.scene, entity.x, entity.row, {
    damage: 1000,
    distance: 13,
    duration: 3500,
    faction: Faction.ZOMBIE,
    color: 0x39c5bb,
    alphaFrom: 0.4,
    alphaTo: 0.9,
  });
}

function createWardenSmash(entity: BaseGolemEntity) {
  MobCmd.DamagePlantsArea(entity.col, entity.row, 1, 1, 180);
  MobCmd.Spawn(4, entity.scene, entity.col, entity.row, -10);
  MobCmd.Spawn(5, entity.scene, entity.col, entity.row, -10);
}


export class WardenEntity extends BaseGolemEntity {
  public constructor(scene: Phaser.Scene & any, col: number, row: number, model: PresetMonsterModel, waveID: number) {
    super(scene, col, row, model, waveID, 19);
  }

  protected createProps() {
    return WardenGolemAnimProps;
  }

  protected getCallBase() {
    return 40;
  }

  protected getCastDelay() {
    return 4000;
  }

  protected getRecoverDelay() {
    return 3000;
  }

  protected skill1(): void {
    createWardenLaser(this);
  }

  protected skill2(): void {
    this.getLegacyController()?.raw.highJump?.();
    this.tickmanager.delayedCall({
      delay: 1000,
      callback: () => {
        this.getLegacyController()?.raw.land?.();
        createWardenSmash(this);
      }
    });
  }

  protected reposition(done: () => void): void {
    this.getLegacyController()?.raw.dig?.();
    this.tickmanager.delayedCall({
      delay: 1600,
      callback: () => {
        const newRow = Phaser.Math.Between(0, PositionManager.Instance.Row_Number - 1);
        const newCol = this.random() > 0.5 ? 8 : 3;
        const bodyPos = PositionManager.Instance.getZombieBodyCenter(newCol, newRow);
        const viewPos = PositionManager.Instance.getZombieBottomCenter(newCol, newRow);
        this.col = newCol;
        this.row = newRow;
        this.rigidBody?.setTranslation(bodyPos, true);
        this.animController.updatePosition(viewPos.x + this.offsetX, viewPos.y + this.offsetY);
        this.getLegacyController()?.raw.getOut?.();
        done();
      }
    });
  }
}

export const WardenData = new PresetMonsterModel({
  mid: 13,
  nameKey: "Warden",
  level: 999,
  weight: () => 0,
  leastWaveID: 0,
  rank: "elite",
  maxHealth: 18000,
  baseSpeed: MonsterSpeed.Warden,
  attackDamage: 60,
  attackInterval: 1200,
  createEntity: (scene, col, row, model, waveID) => new WardenEntity(scene, col, row, model, waveID),
});
