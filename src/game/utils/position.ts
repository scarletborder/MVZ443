// 计算各种东西应该出现的坐标

export class PositionCalc {
    scaleFactor: number = 1;
    gridOffsetX: number = 50;
    gridOffsetY: number = 100;
    GRID_SIZEX: number = 80;
    GRID_SIZEY: number = 90;

    constructor(scaleFactor: number) {
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
            sizeX: 400 * this.scaleFactor,
            sizeY: 300 * this.scaleFactor
        }
    }

    // 获得子弹的中间位置
    public getBulletCenter(col: number, row: number) {
        let { x, y } = this.getPlantBottomCenter(col, row);

        return {
            x: x * this.scaleFactor,
            y: y - 55 * this.scaleFactor
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
            sizeX: 80 * this.scaleFactor,
            sizeY: 120 * this.scaleFactor
        }

    }

    // 获得僵尸的body size
    public getZombieBodySize() {
        return {
            sizeX: 130 * this.scaleFactor,
            sizeY: 90 * this.scaleFactor
        }
    }

    // 根据(x,y)计算(col,row)
    public getGridByPos(x: number, y: number) {
        //  判断是否超越
        if (x < this.gridOffsetX || y < this.gridOffsetY ||
            x > this.gridOffsetX + this.GRID_SIZEX * 9 || y > this.gridOffsetY + this.GRID_SIZEY * 5) {
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