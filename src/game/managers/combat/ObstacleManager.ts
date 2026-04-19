import { ObstacleEntity } from "../../models/entities/ObstacleEntity";
import { BaseManager } from "../BaseManager";

export default class ObstacleManager extends BaseManager {
  private static _instance: ObstacleManager;

  public ObstaclesMap: Map<string, Array<ObstacleEntity>> = new Map();

  constructor() {
    super();
    this.ObstaclesMap = new Map();
  }

  public Load(): void { }

  public Reset(): void {
    this.ObstaclesMap.clear();
  }

  public static get Instance(): ObstacleManager {
    if (!this._instance) {
      this._instance = new ObstacleManager();
    }
    return this._instance;
  }

  public RegisterObstacle(obstacle: ObstacleEntity) {
    const key = `${obstacle.col}-${obstacle.row}`;
    if (!this.ObstaclesMap.has(key)) {
      this.ObstaclesMap.set(key, [obstacle]);
      return;
    }
    this.ObstaclesMap.get(key)?.push(obstacle);
  }

  public UnregisterObstacle(obstacle: ObstacleEntity) {
    const key = `${obstacle.col}-${obstacle.row}`;
    const list = this.ObstaclesMap.get(key);
    if (!list) return;

    const index = list.indexOf(obstacle);
    if (index >= 0) {
      list.splice(index, 1);
    }
    if (list.length === 0) {
      this.ObstaclesMap.delete(key);
    }
  }

  public GetObstacles(col: number, row: number): ObstacleEntity[] {
    return [...(this.ObstaclesMap.get(`${col}-${row}`) ?? [])];
  }

  public HasObstacle(col: number, row: number): boolean {
    return this.GetObstacles(col, row).length > 0;
  }
}
