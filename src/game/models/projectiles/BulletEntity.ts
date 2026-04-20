import { _Typedebuffs } from "../../../constants/game";
import DepthUtils from "../../../utils/depth";
import { PositionManager } from "../../managers/view/PositionManager";
import type { Game } from "../../scenes/Game";
import { CollisionContext } from "../../types";
import PlantHelper from "../../utils/helper/PlantHelper";
import { CombatEntity } from "../core/CombatEntity";
import { MonsterEntity } from "../entities/MonsterEntity";
import { PlantEntity } from "../entities/PlantEntity";
import { ProjectileEntity } from "../entities/ProjectileEntity";
import { BulletConfig, BulletModel } from "./ProjectileModels";

export class BulletEntity extends ProjectileEntity<BulletModel> {
  public baseDepth: number;
  public currentPenetrate: number;
  public penetratePower: number;
  public penetratedPunish: number;
  hasPenetrated: Set<CombatEntity> = new Set(); // Track pierced targets to avoid duplicate hits.
  public sprite!: Phaser.GameObjects.Sprite;

  private prevRenderX: number;
  private prevRenderY: number;
  private currentRenderX: number;
  private currentRenderY: number;

  private prevX = 0; // Previous logical x for travel distance checks.
  private traveledDistanceX: number = 0; // Total traveled logical x distance.
  private maxDistanceX: number; // Max logical travel distance.

  bounceable: boolean = true; // Whether the bullet can bounce.
  speed: number;

  skipTiny: boolean; // Whether tiny units should be ignored.

  constructor(scene: Game, x: number, row: number, model: BulletModel, cfg: BulletConfig) {
    const y = PositionManager.Instance.getRowCenterY(row);
    super(scene, x, y, model, cfg);
    this.currentDamage = cfg.damage;
    this.bounceable = cfg.bounceable ?? true;

    this.traveledDistanceX = 0;
    this.prevX = x;
    this.maxDistanceX = (cfg.maxDistance ?? 128) * PositionManager.Instance.GRID_SIZEX;
    this.speed = cfg.speed ?? model.speed;

    this.prevRenderX = x;
    this.prevRenderY = y;
    this.currentRenderX = x;
    this.currentRenderY = y;

    this.currentPenetrate = 0;
    this.hasPenetrated = new Set<CombatEntity>();
    this.penetratePower = cfg.penetratePower ?? model.penetratePower;
    this.penetratedPunish = cfg.penetratedPunish ?? model.penetratedPunish;

    this.skipTiny = cfg.skipTiny ?? true;

    // Visuals
    const col = PositionManager.Instance.getColByX(x);
    this.baseDepth = DepthUtils.getProjectileDepth("bullet", col);
    this.sprite = scene.add.sprite(this.x, this.y, model.texture);
    const size = PositionManager.Instance.getBulletDisplaySize();
    this.sprite.setDisplaySize(size.sizeX, size.sizeY);
    this.sprite.setDepth(this.baseDepth);
    this.viewGroup.add(this.sprite);

    // Physics
    const bodySize = PositionManager.Instance.getBulletBodySize();
    this.createSensor(bodySize.sizeX, bodySize.sizeY);

    // Initial velocity
    this.rigidBody?.setLinvel({ x: this.speed, y: 0 }, true);
  }

  buildView() { }

  public override updateView(vec: { x: number; y: number }, rotation?: number): void {
    this.prevRenderX = this.currentRenderX;
    this.prevRenderY = this.currentRenderY;
    this.currentRenderX = vec.x;
    this.currentRenderY = vec.y;

    this.x = vec.x;
    this.y = vec.y;
    this.sprite.setPosition(this.x, this.y);

    if (rotation !== undefined) {
      this.sprite.setRotation(rotation);
    }
  }

  stepUpdate() {
    super.stepUpdate();

    // Destroy if it leaves the world bounds.
    const bounds = PositionManager.Instance.getWorldBounds();
    if (this.x > bounds.right || this.x < bounds.left ||
      this.y > bounds.bottom || this.y < bounds.top) {
      this.destroy();
      return;
    }

    // Destroy if it exceeds the max travel distance.
    const deltaX = Math.abs(this.x - this.prevX);
    this.traveledDistanceX += deltaX;
    this.prevX = this.x;
    if (this.traveledDistanceX >= this.maxDistanceX) {
      this.destroy();
      return;
    }

    // Flip sprite based on horizontal velocity.
    if (this.rigidBody) {
      const vx = this.rigidBody.linvel().x;
      this.sprite.setFlipX(vx < 0);
    }
  }

  public override stepMove(alpha: number): void {
    const x = Phaser.Math.Linear(this.prevRenderX, this.currentRenderX, alpha);
    const y = Phaser.Math.Linear(this.prevRenderY, this.currentRenderY, alpha);
    this.sprite.setPosition(x, y);
  }

  // Reverse horizontal velocity after a bounce.
  public reverseVelocityX(): void {
    if (!this.bounceable) return;
    if (this.rigidBody) {
      const vel = this.rigidBody.linvel();
      this.rigidBody.setLinvel({ x: -vel.x, y: vel.y }, true);
    }
  }

  // Override collision handling to support piercing and priority logic.
  override onCollision(ctx: CollisionContext): void {
    console.log(`BulletEntity collided with entity at (${ctx.targetEntity.x.toFixed(2)}, ${ctx.targetEntity.y.toFixed(2)})`);
    // Only combat entities can be hit.
    if (!(ctx.targetEntity instanceof CombatEntity)) return;

    // Basic filtering.
    if (!ctx.targetEntity.takeDamage) return;
    if (this.hasAttacked.has(ctx.targetEntity)) return;
    if (ctx.targetEntity.faction === this.faction) return;

    // Height / flying filters.
    if (this.skipTiny && ctx.targetEntity.isTiny) return;
    if (this.couldAttackFlying === false) {
      if (ctx.targetEntity instanceof MonsterEntity &&
        ctx.targetEntity.isFlying) return;
    }

    // Void filter.
    if (ctx.targetEntity instanceof MonsterEntity && ctx.targetEntity.isInVoid) return;

    // Piercing rules.
    const target = ctx.targetEntity as CombatEntity;
    if (this.hasPenetrated.has(target) ||
      this.currentPenetrate > this.penetratePower) return;

    // Recursively pierce the highest-priority plant in the same cell.
    const penetrateHighestPriorityPlant = (plants: PlantEntity[], currentTarget: PlantEntity): void => {
      if (this.hasPenetrated.has(currentTarget) ||
        this.currentPenetrate > this.penetratePower) {
        return;
      }

      this.applyEffect(currentTarget);

      if (this.currentPenetrate > this.penetratePower) {
        this.destroy();
        return;
      }

      const nextTarget = plants.find(
        plant => plant !== currentTarget &&
          !this.hasPenetrated.has(plant) &&
          PlantHelper.IsMorePriorityPlant(plant, currentTarget),
      );

      if (nextTarget) {
        penetrateHighestPriorityPlant(plants, nextTarget);
      }
    };

    if (target instanceof PlantEntity) {
      const row = target.row;
      const col = target.col;
      const plants = [...PlantHelper.GetPlantsInGrid(col, row)];

      penetrateHighestPriorityPlant(plants, target);
      return;
    }

    this.applyEffect(target);
    return;
  }

  // Apply bullet hit effects to the target.
  protected applyEffect(t: CombatEntity): void {
    this.currentPenetrate++;
    this.hasPenetrated.add(t);

    // Damage
    this.hasAttacked.add(t);
    t.takeDamage(this.currentDamage, this.dealer, this);

    // debuff
    if (this.debuff) {
      t.addDebuff(this.debuff, this.debuffDuration);
    }

    // Damage decay after piercing.
    if (this.currentPenetrate < this.penetratePower) {
      this.currentDamage = Math.floor(this.currentDamage * this.penetratedPunish);
    } else {
      this.destroy();
    }
  }
}
