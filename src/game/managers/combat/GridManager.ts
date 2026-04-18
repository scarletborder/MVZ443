import { BaseManager } from "../BaseManager";
import { PositionManager } from "../view/PositionManager";

type GridType = 'ground' | 'water' | 'void' | 'sky';
export type GridProperty = {
  type: GridType;
}

export default class GridManager extends BaseManager {
  private static _instance: GridManager;

  GridProperties: Record<number, Record<number, GridProperty>> | null = null;

  // 每一行的格子类型占比，用于生成怪物时的权重计算
  private __hasCaculatedGridPropertyRatio: boolean = false;
  private __gridPropertyRatio: Array<Record<'ground' | 'water' | 'void', number>>;

  constructor() {
    super();
    // 初始化
  }

  public setGridProperty(gridProperties: Record<number, Record<number, GridProperty>>) {
    this.GridProperties = gridProperties;
  }
  public Load(): void { }
  public Reset() {
    this.GridProperties = null;
  }

  public static get Instance(): GridManager {
    if (!this._instance) {
      this._instance = new GridManager();
    }
    return this._instance;
  }

  public GetGridProperty(col: number, row: number): GridProperty | null {
    if (!this.GridProperties) return null;
    return this.GridProperties[row]?.[col] || null;
  }

  // 调查row的含水/void率
  public RowPropertyRatio(row: number, property: 'ground' | 'water' | 'void'): number {
    const calc = (row: number, property: 'ground' | 'water' | 'void') => {
      let count = 0;
      let sum = 0;
      for (let col = 0; col < PositionManager.Instance.Col_Number; col++) {
        sum++;
        if (this.GridProperties?.[row]?.[col]?.type === property) {
          count++;
        }
      }
      return count / sum;
    }

    if (!this.__hasCaculatedGridPropertyRatio) {
      // 为所有row计算一遍
      this.__gridPropertyRatio = [];
      for (let i = 0; i < PositionManager.Instance.Row_Number; i++) {
        this.__gridPropertyRatio.push({
          ground: calc(i, 'ground'),
          water: calc(i, 'water'),
          void: calc(i, 'void')
        })
      }
      this.__hasCaculatedGridPropertyRatio = true;
    }

    return this.__gridPropertyRatio[row][property];
  }
}