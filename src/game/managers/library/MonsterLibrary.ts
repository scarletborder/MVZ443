import { MonsterModel } from "../../models/MonsterModel";


export class MonsterLibrary {
  // 存储所有的怪物蓝图
  private static models: Map<number, MonsterModel> = new Map();

  public static get Models() {
    return this.models;
  }

  // 游戏初始化时调用一次，把所有写好的怪物注册进去
  public static Initialize() {
    if (this.models.size > 0) return; // 防止重复初始化

    // this.Register(PeashooterData);
    // ... 注册其他怪物

    console.log(`[MonsterLibrary] Initialized ${this.models.size} Monsters.`);
  }

  // 注册单个怪物
  private static Register(model: MonsterModel) {
    if (this.models.has(model.mid)) {
      console.warn(`[MonsterLibrary] MID ${model.mid} is already registered!`);
      return;
    }
    this.models.set(model.mid, model);
  }

  // 根据 mid 获取蓝图
  public static GetModel(mid: number): MonsterModel | undefined {
    return this.models.get(mid);
  }
}