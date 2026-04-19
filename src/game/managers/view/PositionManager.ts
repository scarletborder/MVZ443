import { BaseManager } from "../BaseManager";

/**
 * PositionManager
 * - World/grid coordinates stay in a fixed logical space.
 * - `scaleFactor` is kept only for view-layer compatibility.
 */
export class PositionManager extends BaseManager {
  private static _instance: PositionManager;

  private static readonly BASE_GRID_OFFSET_X = 50;
  private static readonly BASE_GRID_OFFSET_Y = 100;
  private static readonly BASE_GRID_SIZE_X = 80;
  private static readonly BASE_GRID_SIZE_Y = 90;
  private static readonly WORLD_HORIZONTAL_MARGIN = 40;
  private static readonly WORLD_VERTICAL_MARGIN = 40;

  private _scaleFactor = 1;
  private _gridOffsetX = PositionManager.BASE_GRID_OFFSET_X;
  private _gridOffsetY = PositionManager.BASE_GRID_OFFSET_Y;
  private _GRID_SIZEX = PositionManager.BASE_GRID_SIZE_X;
  private _GRID_SIZEY = PositionManager.BASE_GRID_SIZE_Y;

  private _Row_Number = 4;
  private _Col_Number = 9;

  public static get Instance(): PositionManager {
    if (!PositionManager._instance) {
      PositionManager._instance = new PositionManager();
    }
    return PositionManager._instance;
  }

  public Load(): void { }

  public setStageGrid(scaleFactor: number, row_number: number = 4, col_number: number = 9): void {
    if (row_number > 6) throw new Error("row_number should be less than or equal to 6");

    let gridOffsetY = PositionManager.BASE_GRID_OFFSET_Y;
    if (row_number === 6) {
      gridOffsetY = 20;
    } else if (row_number <= 5) {
      gridOffsetY = PositionManager.BASE_GRID_OFFSET_Y
        + (5 - row_number) * (PositionManager.BASE_GRID_SIZE_Y * 2 / 3);
    }

    this._Row_Number = row_number;
    this._Col_Number = col_number;
    this._scaleFactor = scaleFactor;

    // Logical world size is fixed; screen scaling should not affect physics/world coordinates.
    this._gridOffsetX = PositionManager.BASE_GRID_OFFSET_X;
    this._gridOffsetY = gridOffsetY;
    this._GRID_SIZEX = PositionManager.BASE_GRID_SIZE_X;
    this._GRID_SIZEY = PositionManager.BASE_GRID_SIZE_Y;
  }

  public Reset(): void {
    this._scaleFactor = 1;
    this._gridOffsetX = PositionManager.BASE_GRID_OFFSET_X;
    this._gridOffsetY = PositionManager.BASE_GRID_OFFSET_Y;
    this._GRID_SIZEX = PositionManager.BASE_GRID_SIZE_X;
    this._GRID_SIZEY = PositionManager.BASE_GRID_SIZE_Y;
    this._Row_Number = 4;
    this._Col_Number = 9;
  }

  public getGridTopLeft(col: number, row: number): { x: number; y: number } {
    return {
      x: col * this._GRID_SIZEX + this._gridOffsetX,
      y: row * this._GRID_SIZEY + this._gridOffsetY,
    };
  }

  public getGridCenter(col: number, row: number): { x: number; y: number } {
    const topLeft = this.getGridTopLeft(col, row);
    return {
      x: topLeft.x + this._GRID_SIZEX / 2,
      y: topLeft.y + this._GRID_SIZEY / 2,
    };
  }

  public getPlantBottomCenter(col: number, row: number): { x: number; y: number } {
    const { x, y } = this.getGridTopLeft(col, row);
    return {
      x: x + this._GRID_SIZEX / 2,
      y: y + this._GRID_SIZEY,
    };
  }

  public getPlantBodyCenter(col: number, row: number): { x: number; y: number } {
    const bottomCenter = this.getPlantBottomCenter(col, row);
    return this.getPlantBodyCenterByBottom(bottomCenter.x, bottomCenter.y);
  }

  public getPlantDisplaySize(): { sizeX: number; sizeY: number } {
    return {
      sizeX: this._GRID_SIZEX * 0.9,
      sizeY: this._GRID_SIZEY * 0.9,
    };
  }

  public getPlantBodySize(): { sizeX: number; sizeY: number } {
    return {
      sizeX: 60,
      sizeY: 45,
    };
  }

  public getPlantBodyCenterByBottom(x: number, y: number): { x: number; y: number } {
    const bodySize = this.getPlantBodySize();
    return {
      x,
      y: y - bodySize.sizeY / 2,
    };
  }

  public getPlantBottomCenterByBody(x: number, y: number): { x: number; y: number } {
    const bodySize = this.getPlantBodySize();
    return {
      x,
      y: y + bodySize.sizeY / 2,
    };
  }

  public getBulletCenter(col: number, row: number): { x: number; y: number } {
    return this.getGridCenter(col, row);
  }

  public getRowCenterY(row: number): number {
    return row * this._GRID_SIZEY + this._gridOffsetY + this._GRID_SIZEY / 2;
  }

  public getBulletDisplaySize(): { sizeX: number; sizeY: number } {
    return {
      sizeX: 20 * this._scaleFactor,
      sizeY: 20 * this._scaleFactor,
    };
  }

  public getBulletBodySize(): { sizeX: number; sizeY: number } {
    return {
      sizeX: 20,
      sizeY: 20,
    };
  }

  public getZombieBottomCenter(col: number, row: number): { x: number; y: number } {
    const { x, y } = this.getGridTopLeft(col, row);
    return {
      x: x + this._GRID_SIZEX / 2,
      y: y + this._GRID_SIZEY,
    };
  }

  public getZombieBodyCenter(col: number, row: number): { x: number; y: number } {
    const bottomCenter = this.getZombieBottomCenter(col, row);
    return this.getZombieBodyCenterByBottom(bottomCenter.x, bottomCenter.y);
  }

  public getZombieDisplaySize(): { sizeX: number; sizeY: number } {
    return {
      sizeX: 72 * this._scaleFactor,
      sizeY: 108 * this._scaleFactor,
    };
  }

  public getZombieBodySize(): { sizeX: number; sizeY: number } {
    return {
      sizeX: 30,
      sizeY: 45,
    };
  }

  public getZombieBodyCenterByBottom(x: number, y: number): { x: number; y: number } {
    const bodySize = this.getZombieBodySize();
    return {
      x,
      y: y - bodySize.sizeY / 2,
    };
  }

  public getZombieBottomCenterByBody(x: number, y: number): { x: number; y: number } {
    const bodySize = this.getZombieBodySize();
    return {
      x,
      y: y + bodySize.sizeY / 2,
    };
  }

  public GetGridByPos(x: number, y: number): { col: number; row: number; aspect: "up" | "down" } {
    const isOutOfBounds =
      x < this._gridOffsetX ||
      y < this._gridOffsetY ||
      x > this._gridOffsetX + this._GRID_SIZEX * this._Col_Number ||
      y > this._gridOffsetY + this._GRID_SIZEY * this._Row_Number;

    if (isOutOfBounds) {
      return { col: -1, row: -1, aspect: "down" };
    }

    const col = Math.floor((x - this._gridOffsetX - 1) / this._GRID_SIZEX);
    const row = Math.floor((y - this._gridOffsetY - 1) / this._GRID_SIZEY);
    const aspect = y < this.getGridCenter(col, row).y ? "up" : "down";

    return { col, row, aspect };
  }

  public getColByX(x: number): number {
    if (x < this._gridOffsetX || x > this._gridOffsetX + this._GRID_SIZEX * this._Col_Number) {
      return -1;
    }
    return Math.floor((x - this._gridOffsetX - 1) / this._GRID_SIZEX);
  }

  public getRowByY(y: number): number {
    if (y < this._gridOffsetY || y > this._gridOffsetY + this._GRID_SIZEY * this._Row_Number) {
      return -1;
    }
    return Math.floor((y - this._gridOffsetY - 1) / this._GRID_SIZEY);
  }

  public getCenterByPos(x: number, y: number): { x: number; y: number } {
    const { col, row } = this.GetGridByPos(x, y);
    return this.getGridCenter(col, row);
  }

  public getRandomCol(rand: number): number {
    return Math.floor(this._Col_Number * rand);
  }

  public getRandomRow(rand: number): number {
    return Math.floor(this._Row_Number * rand);
  }

  public get scaleFactor(): number {
    return this._scaleFactor;
  }

  public get GRID_SIZEX(): number {
    return this._GRID_SIZEX;
  }

  public get GRID_SIZEY(): number {
    return this._GRID_SIZEY;
  }

  public get gridOffsetX(): number {
    return this._gridOffsetX;
  }

  public get gridOffsetY(): number {
    return this._gridOffsetY;
  }

  public get Col_Number(): number {
    return this._Col_Number;
  }

  public get Row_Number(): number {
    return this._Row_Number;
  }

  public getScaleFactor(): number {
    return this._scaleFactor;
  }

  public getRowCount(): number {
    return this._Row_Number;
  }

  public getColCount(): number {
    return this._Col_Number;
  }

  public getGridSize(): { width: number; height: number } {
    return {
      width: this._GRID_SIZEX,
      height: this._GRID_SIZEY,
    };
  }

  public getGridOffset(): { x: number; y: number } {
    return {
      x: this._gridOffsetX,
      y: this._gridOffsetY,
    };
  }

  public getWorldBounds(): { left: number; right: number; top: number; bottom: number } {
    return {
      left: -PositionManager.WORLD_HORIZONTAL_MARGIN,
      right: this._gridOffsetX + this._GRID_SIZEX * this._Col_Number + PositionManager.WORLD_HORIZONTAL_MARGIN,
      top: -PositionManager.WORLD_VERTICAL_MARGIN,
      bottom: this._gridOffsetY + this._GRID_SIZEY * this._Row_Number + PositionManager.WORLD_VERTICAL_MARGIN,
    };
  }
}
