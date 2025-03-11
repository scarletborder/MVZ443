// 计算各种东西应该出现的坐标
// body 位置不用带上scaleFactor

export class PositionCalc {
    scaleFactor: number = 1;
    gridOffsetX: number = 50;
    gridOffsetY: number;
    GRID_SIZEX: number = 80;
    GRID_SIZEY: number = 90;

    Row_Number: number = 5;
    Col_Number: number = 9;

    constructor(scaleFactor: number, row_number: number = 5, col_number: number = 9) {
        // 如果行号不为空,则根据行号计算gridOffsetY
        if (row_number > 6) throw ("row_number should be less than 6");
        if (row_number === 6) this.gridOffsetY = 20;
        else if (row_number <= 5) this.gridOffsetY = 100 + (5 - row_number) * (this.GRID_SIZEY * 2 / 3);

        this.Row_Number = row_number;
        this.Col_Number = col_number;

        this.scaleFactor = scaleFactor;
        this.gridOffsetX = this.gridOffsetX * this.scaleFactor;
        this.gridOffsetY = this.gridOffsetY * this.scaleFactor;
        this.GRID_SIZEX = this.GRID_SIZEX * this.scaleFactor;
        this.GRID_SIZEY = this.GRID_SIZEY * this.scaleFactor;
    }

    // 计算格子的左上角
    public getGridTopLeft(col: number, row: number) {
        return {
            x: (col * this.GRID_SIZEX + this.gridOffsetX),
            y: (row * this.GRID_SIZEY + this.gridOffsetY)
        }
    }

    // 计算格子的中心
    public getGridCenter(col: number, row: number) {
        const topLeft = this.getGridTopLeft(col, row);
        return {
            x: topLeft.x + this.GRID_SIZEX / 2,
            y: topLeft.y + this.GRID_SIZEY / 2
        };
    }

    // 计算植物底部中间
    public getPlantBottomCenter(col: number, row: number) {
        const { x, y } = this.getGridTopLeft(col, row);

        return {
            x: x + this.GRID_SIZEX / 2,
            y: y + this.GRID_SIZEY
        };
    }

    // 获得植物的display size
    public getPlantDisplaySize() {
        return {
            sizeX: this.GRID_SIZEX * 0.9,
            sizeY: this.GRID_SIZEY * 0.9
        }
    }

    // 获得植物的碰撞体积
    public getPlantBodySize() {
        return {
            sizeX: 60,
            sizeY: 45
        }
    }

    // 获得子弹的中间位置
    public getBulletCenter(col: number, row: number) {
        const { x, y } = this.getPlantBottomCenter(col, row);

        return {
            x: x,
            y: y - 45 * this.scaleFactor
        }
    }

    // 获得子弹的display size
    public getBulletDisplaySize() {
        return {
            sizeX: 20 * this.scaleFactor,
            sizeY: 20 * this.scaleFactor
        }
    }

    // 获得子弹的碰撞体积
    public getBulletBodySize() {
        return {
            sizeX: 20 * this.scaleFactor,
            sizeY: 20 * this.scaleFactor
        }
    }

    // 获得僵尸的中下位置
    public getZombieBottomCenter(col: number, row: number) {
        const { x, y } = this.getGridTopLeft(col, row);
        return {
            x: x + this.GRID_SIZEX / 2,
            y: y + this.GRID_SIZEY
        };
    }

    // 获得僵尸的display size
    public getZombieDisplaySize() {
        return {
            sizeX: 72 * this.scaleFactor,
            sizeY: 108 * this.scaleFactor
        }

    }

    // 获得僵尸的body size
    public getZombieBodySize() {
        return {
            sizeX: 30,
            sizeY: 50
        }
    }

    // 根据(x,y)计算(col,row)
    public getGridByPos(x: number, y: number) {
        //  判断是否超越
        if (x < this.gridOffsetX || y < this.gridOffsetY ||
            x > this.gridOffsetX + this.GRID_SIZEX * this.Col_Number || y > this.gridOffsetY + this.GRID_SIZEY * this.Row_Number) {
            return {
                col: -1,
                row: -1
            }
        }

        return {
            col: Math.floor((x - this.gridOffsetX) / this.GRID_SIZEX),
            row: Math.floor((y - this.gridOffsetY) / this.GRID_SIZEY)
        }
    }
}