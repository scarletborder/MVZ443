import GolemAnim, { GolemAnimProps } from "../../../sprite/golem";
import { newNormalEvokerAnim, newNormalSkeletonAnim, newNormalVindicatorAnim, newNormalZombieAnim } from "../../../sprite/normal_zombie";
import IMutantAnim, { MutantAnimProps } from "../../../sprite/zombie_mutant";
import type { Game } from "../../../scenes/Game";
import type { IMonsterAnimController } from "./IMonsterAnimController";

type LegacyAnimLike = {
  updatePosition(x: number, y: number): void;
  setDepth(depth: number): void;
  highlight(): void;
  twinkle?(): void;
  startLegSwing(): void;
  stopLegSwing(): void;
  startArmSwing(): void;
  stopArmSwing(): void;
  destroy(): void;
  isInAnim?: boolean;
};

const TARGET_KEYS = [
  "body",
  "head",
  "armLeft",
  "armRight",
  "legLeft",
  "legRight",
  "upperArmLeft",
  "upperArmRight",
  "lowerArmLeft",
  "lowerArmRight",
  "upperLegLeft",
  "upperLegRight",
  "lowerLegLeft",
  "lowerLegRight",
  "handObject",
  "backObject",
  "dirt",
] as const;

export class LegacyMonsterAnimController<TAnim extends LegacyAnimLike> implements IMonsterAnimController {
  public constructor(public readonly raw: TAnim) { }

  public get isInAnim() {
    return this.raw.isInAnim;
  }

  public updatePosition(x: number, y: number): void {
    this.raw.updatePosition(x, y);
  }

  public setDepth(depth: number): void {
    this.raw.setDepth(depth);
  }

  public highlight(): void {
    this.raw.highlight();
  }

  public twinkle?(): void {
    this.raw.twinkle?.();
  }

  public startLegSwing(): void {
    this.raw.startLegSwing();
  }

  public stopLegSwing(): void {
    this.raw.stopLegSwing();
  }

  public startArmSwing(): void {
    this.raw.startArmSwing();
  }

  public stopArmSwing(): void {
    this.raw.stopArmSwing();
  }

  public destroy(): void {
    this.raw.destroy();
  }

  public getTargets(): Phaser.GameObjects.GameObject[] {
    const targets: Phaser.GameObjects.GameObject[] = [];
    for (const key of TARGET_KEYS) {
      const value = (this.raw as Record<string, unknown>)[key];
      if (value instanceof Phaser.GameObjects.GameObject) {
        targets.push(value);
      }
    }
    return targets;
  }
}

export function createZombieAnimController(
  type: "zombie" | "skeleton" | "evoker" | "vindicator",
  scene: Game,
  x: number,
  y: number,
) {
  const map = {
    zombie: newNormalZombieAnim,
    skeleton: newNormalSkeletonAnim,
    evoker: newNormalEvokerAnim,
    vindicator: newNormalVindicatorAnim,
  } as const;

  return new LegacyMonsterAnimController(map[type](scene, x, y));
}

export function createGolemAnimController(scene: Game, x: number, y: number, props: GolemAnimProps) {
  return new LegacyMonsterAnimController(new GolemAnim(scene, x, y, props));
}

export function createMutantAnimController(scene: Game, x: number, y: number, props: MutantAnimProps) {
  return new LegacyMonsterAnimController(new IMutantAnim(scene, x, y, props));
}
