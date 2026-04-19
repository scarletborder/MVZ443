import { FrameTimer } from "../../../managers/combat/TickerManager";
import { BaseMonsterEntity, PresetMonsterModel } from "../../../models/entities/MonsterEntity";
import { PlantEntity } from "../../../models/entities/PlantEntity";
import { createMutantAnimController } from "../../../models/monster/anims/LegacyMonsterAnimControllers";
import type { Game } from "../../../scenes/Game";
import MobCmd from "../../../utils/cmd/MobCmd";

const mutantProps = {
  Species: "default_mutant",
  bodyKey: "sprMutantBody",
  bodyNum: 2,
  headKey: "sprMutantHead",
  upperArmKey: "sprMutantUpperArm",
  lowerArmKey: "sprMutantLowerArm",
  upperLegKey: "sprMutantUpperLeg",
  lowerLegKey: "sprMutantLowerLeg",
} as const;

export class MutantEntity extends BaseMonsterEntity {
  declare public model: MutantModel;

  public isAttacking = false;
  public attackedPlants: PlantEntity[] = [];
  public preAttackedPlant: PlantEntity | null = null;
  public attackTimer: FrameTimer | null = null;
  public recoverTimer: FrameTimer | null = null;

  public constructor(scene: Game, col: number, row: number, model: MutantModel, waveID: number) {
    super(scene, col, row, model, waveID);
  }

  protected createAnimController() {
    const controller = createMutantAnimController(this.scene, this.x, this.y, mutantProps);
    controller.raw.setHandObject("attach/sign");
    return controller;
  }

  public override startMove() {
    if (this.isFrozen || this.isStop || this.isDying || this.isAttacking) return;
    this.setVelocityX(-this.speed);
    this.animController.startLegSwing();
    this.animController.startArmSwing();
  }

  public override stopMove() {
    this.setVelocityX(0);
    this.animController.stopLegSwing();
  }

  public override startAttacking(target: any) {
    if (!(target instanceof PlantEntity)) {
      super.startAttacking(target);
      return;
    }
    this.model.queueAttackTarget(this, target);
  }

  public clearAttackState() {
    this.attackTimer?.remove();
    this.attackTimer = null;
    this.recoverTimer?.remove();
    this.recoverTimer = null;
    this.isAttacking = false;
    this.attackedPlants = [];
    this.preAttackedPlant = null;
    this.attacking = null;
    this.isStop = false;
  }

  public override destroy() {
    this.clearAttackState();
    super.destroy();
  }
}

export class MutantModel extends PresetMonsterModel {
  public readonly chargeMs = 1500;
  public readonly recoverMs = 1500;
  public readonly smashDamage = 5500;

  public queueAttackTarget(entity: MutantEntity, plant: PlantEntity) {
    if (entity.currentHealth <= 0 || entity.isFrozen || entity.isDying) return;
    if (entity.attackedPlants.includes(plant) || entity.preAttackedPlant === plant) return;

    if (entity.isAttacking && entity.attackedPlants.length > 0) {
      const currentGridPlant = entity.attackedPlants[0];
      if (currentGridPlant.col === plant.col && currentGridPlant.row === plant.row) {
        entity.attackedPlants.push(plant);
        return;
      }
      if (!entity.preAttackedPlant) {
        entity.preAttackedPlant = plant;
      }
      return;
    }

    entity.attackedPlants.push(plant);
    this.startAttackProcess(entity);
  }

  public startAttackProcess(entity: MutantEntity) {
    if (entity.currentHealth <= 0 || entity.isFrozen || entity.isDying || entity.attackedPlants.length === 0) return;

    entity.stopMove();
    entity.isAttacking = true;
    entity.isStop = true;
    entity.attacking = entity.attackedPlants[0];

    const raw = entity.getLegacyController()?.raw;
    raw?.stopArmSwing?.();
    raw?.startLeftArmSmash?.(() => { });

    const attackTargets = [...entity.attackedPlants];
    entity.attackTimer?.remove();
    entity.attackTimer = entity.tickmanager.delayedCall({
      delay: this.chargeMs,
      callback: () => {
        if (entity.currentHealth <= 0 || entity.isFrozen || entity.isDying) return;

        const cells = attackTargets.map((plant) => ({ col: plant.col, row: plant.row }));
        MobCmd.DamagePlantsInCells(cells, this.smashDamage);

        entity.recoverTimer?.remove();
        entity.recoverTimer = entity.tickmanager.delayedCall({
          delay: this.recoverMs,
          callback: () => {
            if (entity.currentHealth <= 0 || entity.isFrozen || entity.isDying) return;

            entity.attackedPlants = [];
            if (entity.preAttackedPlant) {
              entity.attackedPlants.push(entity.preAttackedPlant);
              entity.preAttackedPlant = null;
              this.startAttackProcess(entity);
              return;
            }

            entity.isAttacking = false;
            entity.isStop = false;
            entity.attacking = null;
            entity.startMove();
          }
        });
      }
    });
  }

  public override onCreate(entity: MutantEntity) {
    entity.getLegacyController()?.raw.startBodySwing();
  }

  public override onHurt(entity: MutantEntity, _damage: number, _realDamage: number) {
    entity.animController.highlight();
    const raw = entity.getLegacyController()?.raw;
    if (!raw?.switchBodyFrame) return;
    if (entity.currentHealth >= entity.maxHealth / 2) {
      raw.switchBodyFrame(0);
    } else if (entity.currentHealth > 0) {
      raw.switchBodyFrame(1);
    }
  }

  public override onDeath(entity: MutantEntity) {
    entity.clearAttackState();
  }
}

export const MutantData = new MutantModel({
  mid: 15,
  nameKey: "Mutant",
  level: 8,
  weight: () => 1500,
  leastWaveID: 15,
  maxHealth: 3000,
  baseSpeed: 18,
  attackDamage: 5500,
  attackInterval: 1500,
  createEntity: (scene, col, row, model, waveID) => new MutantEntity(scene, col, row, model as MutantModel, waveID),
});
