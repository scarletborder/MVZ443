import { BaseManager } from "../BaseManager";

/**
 * PositionManager - 处理游戏中所有位置计算（单例模式）
 * 在 FIT 拉伸模式下工作，根据屏幕尺寸动态调整布局
 * 注意：物理体的位置不需要带上 scaleFactor
 */
export class PositionManager extends BaseManager {
  private static _instance: PositionManager;

  private _scaleFactor: number = 1;
  private _gridOffsetX: number = 50;
  private _gridOffsetY: number = 100;
  private _GRID_SIZEX: number = 80;
  private _GRID_SIZEY: number = 90;

  private _Row_Number: number = 4;
  private _Col_Number: number = 9;


  /**
   * 获取单例实例
   */
  public static get Instance(): PositionManager {
    if (!PositionManager._instance) {
      PositionManager._instance = new PositionManager();
    }
    return PositionManager._instance;
  }

  public Load(): void { }

  /**
   * 初始化网格配置
   * 在游戏场景创建时调用，以配置网格参数和缩放因子
   */
  public setStageGrid(scaleFactor: number, row_number: number = 4, col_number: number = 9): void {
    // 验证行号
    if (row_number > 6) throw new Error('row_number should be less than or equal to 6');

    // 计算 gridOffsetY
    if (row_number === 6) {
      this._gridOffsetY = 20;
    } else if (row_number <= 5) {
      this._gridOffsetY = 100 + (5 - row_number) * (this._GRID_SIZEY * 2 / 3);
    } else {
      this._gridOffsetY = 100;
    }

    this._Row_Number = row_number;
    this._Col_Number = col_number;
    this._scaleFactor = scaleFactor;

    // 应用缩放因子
    this._gridOffsetX = 50 * this._scaleFactor;
    this._gridOffsetY = this._gridOffsetY * this._scaleFactor;
    this._GRID_SIZEX = 80 * this._scaleFactor;
    this._GRID_SIZEY = 90 * this._scaleFactor;
  }

  /**
   * 重置管理器到初始状态
   */
  public Reset(): void {
    this._scaleFactor = 1;
    this._gridOffsetX = 50;
    this._gridOffsetY = 100;
    this._GRID_SIZEX = 80;
    this._GRID_SIZEY = 90;
    this._Row_Number = 4;
    this._Col_Number = 9;
  }

  /**
   * 获取格子的左上角坐标
   */
  public getGridTopLeft(col: number, row: number): { x: number; y: number } {
    return {
      x: col * this._GRID_SIZEX + this._gridOffsetX,
      y: row * this._GRID_SIZEY + this._gridOffsetY
    };
  }

  /**
   * 获取格子的中心坐标
   */
  public getGridCenter(col: number, row: number): { x: number; y: number } {
    const topLeft = this.getGridTopLeft(col, row);
    return {
      x: topLeft.x + this._GRID_SIZEX / 2,
      y: topLeft.y + this._GRID_SIZEY / 2
    };
  }

  /**
   * 获取植物底部中间的坐标
   */
  public getPlantBottomCenter(col: number, row: number): { x: number; y: number } {
    const { x, y } = this.getGridTopLeft(col, row);
    return {
      x: x + this._GRID_SIZEX / 2,
      y: y + this._GRID_SIZEY
    };
  }

  /**
   * 获取植物的显示尺寸
   */
  public getPlantDisplaySize(): { sizeX: number; sizeY: number } {
    return {
      sizeX: this._GRID_SIZEX * 0.9,
      sizeY: this._GRID_SIZEY * 0.9
    };
  }

  /**
   * 获取植物的物理碰撞体尺寸
   * 不需要带上 scaleFactor
   */
  public getPlantBodySize(): { sizeX: number; sizeY: number } {
    return {
      sizeX: 60,
      sizeY: 45
    };
  }

  /**
   * 获取子弹的中心坐标
   */
  public getBulletCenter(col: number, row: number): { x: number; y: number } {
    return this.getGridCenter(col, row);
  }

  /**
   * 获取某row的中心Y坐标
   */
  public getRowCenterY(row: number): number {
    return row * this._GRID_SIZEY + this._gridOffsetY + this._GRID_SIZEY / 2;
  }

  /**
   * 获取子弹的显示尺寸
   */
  public getBulletDisplaySize(): { sizeX: number; sizeY: number } {
    return {
      sizeX: 20 * this._scaleFactor,
      sizeY: 20 * this._scaleFactor
    };
  }

  /**
   * 获取子弹的物理碰撞体尺寸
   */
  public getBulletBodySize(): { sizeX: number; sizeY: number } {
    return {
      sizeX: 20,
      sizeY: 20
    };
  }

  /**
   * 获取僵尸的底部中间坐标
   */
  public getZombieBottomCenter(col: number, row: number): { x: number; y: number } {
    const { x, y } = this.getGridTopLeft(col, row);
    return {
      x: x + this._GRID_SIZEX / 2,
      y: y + this._GRID_SIZEY
    };
  }

  /**
   * 获取僵尸的显示尺寸
   */
  public getZombieDisplaySize(): { sizeX: number; sizeY: number } {
    return {
      sizeX: 72 * this._scaleFactor,
      sizeY: 108 * this._scaleFactor
    };
  }

  /**
   * 获取僵尸的物理碰撞体尺寸
   * 不需要带上 scaleFactor
   */
  public getZombieBodySize(): { sizeX: number; sizeY: number } {
    return {
      sizeX: 30,
      sizeY: 50
    };
  }

  /**
   * 根据屏幕坐标 (x, y) 计算对应的网格坐标 (col, row)
   * 若坐标超出范围，返回 (-1, -1)
   */
  public GetGridByPos(x: number, y: number): { col: number; row: number; aspect: 'up' | 'down' } {
    const isOutOfBounds =
      x < this._gridOffsetX ||
      y < this._gridOffsetY ||
      x > this._gridOffsetX + this._GRID_SIZEX * this._Col_Number ||
      y > this._gridOffsetY + this._GRID_SIZEY * this._Row_Number;

    if (isOutOfBounds) {
      return { col: -1, row: -1, aspect: 'down' };
    }


    const col = Math.floor((x - this._gridOffsetX - 1) / this._GRID_SIZEX);
    const row = Math.floor((y - this._gridOffsetY - 1) / this._GRID_SIZEY);
    const aspect = (y < this.getGridCenter(col, row).y) ? 'up' : 'down';

    return {
      col,
      row,
      aspect,
    };
  }

  /**
   * 根据 x 坐标计算列号（自动考虑误差）
   */
  public getColByX(x: number): number {
    if (x < this._gridOffsetX || x > this._gridOffsetX + this._GRID_SIZEX * this._Col_Number) {
      return -1; // 超出范围
    }
    return Math.floor((x - this._gridOffsetX - 1) / this._GRID_SIZEX);
  }

  /**
   * 根据 y 坐标计算行号（自动考虑误差）
   */
  public getRowByY(y: number): number {
    if (y < this._gridOffsetY || y > this._gridOffsetY + this._GRID_SIZEY * this._Row_Number) {
      return -1; // 超出范围
    }
    return Math.floor((y - this._gridOffsetY - 1) / this._GRID_SIZEY);
  }



  /**
   * 根据屏幕坐标 (x, y) 计算最近格子的中心坐标
   */
  public getCenterByPos(x: number, y: number): { x: number; y: number } {
    const { col, row } = this.GetGridByPos(x, y);
    return this.getGridCenter(col, row);
  }

  /**
   * 根据随机数 (0-1) 生成随机列号
   */
  public getRandomCol(rand: number): number {
    return Math.floor(this._Col_Number * rand);
  }

  /**
   * 根据随机数 (0-1) 生成随机行号
   */
  public getRandomRow(rand: number): number {
    return Math.floor(this._Row_Number * rand);
  }

  // ==================== 属性 Getter（保持向后兼容） ====================

  /**
   * 获取当前的缩放因子（只读属性）
   */
  public get scaleFactor(): number {
    return this._scaleFactor;
  }

  /**
   * 获取网格单元 X 尺寸（只读属性，保持向后兼容）
   */
  public get GRID_SIZEX(): number {
    return this._GRID_SIZEX;
  }

  /**
   * 获取网格单元 Y 尺寸（只读属性，保持向后兼容）
   */
  public get GRID_SIZEY(): number {
    return this._GRID_SIZEY;
  }

  /**
   * 获取网格 X 偏移量（只读属性，保持向后兼容）
   */
  public get gridOffsetX(): number {
    return this._gridOffsetX;
  }

  /**
   * 获取网格 Y 偏移量（只读属性，保持向后兼容）
   */
  public get gridOffsetY(): number {
    return this._gridOffsetY;
  }

  /**
   * 获取列数（只读属性，保持向后兼容）
   */
  public get Col_Number(): number {
    return this._Col_Number;
  }

  /**
   * 获取行数（只读属性，保持向后兼容）
   */
  public get Row_Number(): number {
    return this._Row_Number;
  }

  // ==================== 便捷方法 ====================

  /**
   * 获取当前的缩放因子（备用方法）
   */
  public getScaleFactor(): number {
    return this._scaleFactor;
  }

  /**
   * 获取网格行数（备用方法）
   */
  public getRowCount(): number {
    return this._Row_Number;
  }

  /**
   * 获取网格列数（备用方法）
   */
  public getColCount(): number {
    return this._Col_Number;
  }

  /**
   * 获取网格的单元尺寸
   */
  public getGridSize(): { width: number; height: number } {
    return {
      width: this._GRID_SIZEX,
      height: this._GRID_SIZEY
    };
  }

  /**
   * 获取网格的偏移量
   */
  public getGridOffset(): { x: number; y: number } {
    return {
      x: this._gridOffsetX,
      y: this._gridOffsetY
    };
  }
}
