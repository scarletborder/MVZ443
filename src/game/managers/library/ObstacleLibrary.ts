import { ObstacleModel } from "../../models/ObstacleModel";
import { ObsidianObstacleData } from "../../presets/obstacle";

export class ObstacleLibrary {
  private static models: Map<number, ObstacleModel> = new Map();

  public static get Models() {
    return this.models;
  }

  public static Initialize() {
    if (this.models.size > 0) return;

    this.Register(ObsidianObstacleData);

    console.log(`[ObstacleLibrary] Initialized ${this.models.size} obstacles.`);
  }

  public static Register(model: ObstacleModel) {
    if (this.models.has(model.oid)) {
      console.warn(`[ObstacleLibrary] OID ${model.oid} is already registered!`);
      return;
    }
    this.models.set(model.oid, model);
  }

  public static GetModel(oid: number): ObstacleModel | undefined {
    return this.models.get(oid);
  }
}
