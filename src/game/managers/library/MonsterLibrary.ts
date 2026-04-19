import { MonsterModel } from "../../models/MonsterModel";
import {
  CapZombieData,
  EvokerData,
  HelmetZombieData,
  MinerHelmetZombieData,
  MinerZombieData,
  MutantData,
  ObsidianGolemData,
  SkeletonBowData,
  SkeletonData,
  StickZombieData,
  TurtleSkeletonBowData,
  TurtleZombieData,
  VindicatorData,
  VindicatorSoliderData,
  WardenData,
  ZombieData,
} from "../../presets/monster";

export class MonsterLibrary {
  private static models: Map<number, MonsterModel> = new Map();

  public static get Models() {
    return this.models;
  }

  public static Initialize() {
    if (this.models.size > 0) return;

    this.Register(ZombieData);
    this.Register(CapZombieData);
    this.Register(HelmetZombieData);
    this.Register(MinerZombieData);
    this.Register(MinerHelmetZombieData);
    this.Register(SkeletonData);
    this.Register(SkeletonBowData);
    this.Register(StickZombieData);
    this.Register(EvokerData);
    this.Register(VindicatorData);
    this.Register(VindicatorSoliderData);
    this.Register(ObsidianGolemData);
    this.Register(WardenData);
    this.Register(TurtleZombieData);
    this.Register(MutantData);
    this.Register(TurtleSkeletonBowData);

    console.log(`[MonsterLibrary] Initialized ${this.models.size} Monsters.`);
  }

  private static Register(model: MonsterModel) {
    if (this.models.has(model.mid)) {
      console.warn(`[MonsterLibrary] MID ${model.mid} is already registered!`);
      return;
    }
    this.models.set(model.mid, model);
  }

  public static GetModel(mid: number): MonsterModel | undefined {
    return this.models.get(mid);
  }
}
