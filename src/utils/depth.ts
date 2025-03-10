export default class DepthManager {
    // 常量定义
    private static readonly LINE_DEPTH_INCREMENT = 10000;
    private static readonly PROJECTILE_TYPE_OFFSET: { [key: string]: number } = {
        bullet: 100000,
        projectile: 300000,
        laser: 500000,
    };
    private static readonly zombieDepth = 1000;
    private static readonly plantDepth = 500;

    /**
     * 根据行号获取基础深度，行号从 0 开始。
     * @param line 行号，假设在 0~8 之间
     * @returns 基础深度
     */
    public static getLineBaseDepth(line: number): number {
        return (line + 1) * this.LINE_DEPTH_INCREMENT;
    }

    /**
     * 获取发射物类型的固定偏移量
     * @param type 发射物类型，例如 'bullet'、'projectile'、'laser'
     * @returns 对应的偏移值
     */
    public static getProjectileTypeOffset(type: 'bullet' | 'projectile' | 'laser'): number {
        return this.PROJECTILE_TYPE_OFFSET[type] || 0;
    }

    /**
     * 根据 Y 偏移计算深度调整
     * @param offsetY Y 方向偏移（以像素为单位）
     * @returns 经过 floor 取整后，每 1px 乘上 15 的偏移值
     */
    public static computeYOffsetAdjustment(offsetY: number): number {
        return Math.floor(offsetY * 15);
    }

    /**
     * 计算 sprite 的深度
     * @param line 行号（0 开始）
     * @param componentOffset 单个 sprite 内部组件偏移，范围建议 1-10
     * @param offsetY Y 方向偏移
     * @returns sprite 的深度值
     */
    public static getSpriteDepth(line: number, componentOffset = 0, offsetY = 0): number {
        const baseDepth = this.getLineBaseDepth(line);
        const yAdjustment = this.computeYOffsetAdjustment(offsetY);
        return baseDepth + yAdjustment + componentOffset;
    }

    public static getComponentDepth(base: number, componentOffset = 0, offsetY = 0): number {
        const yAdjustment = this.computeYOffsetAdjustment(offsetY);
        return base + yAdjustment + componentOffset;
    }

    public static getZombieBasicDepth(line: number, offsetY = 0): number {
        const baseDepth = this.getLineBaseDepth(line);
        const yAdjustment = this.computeYOffsetAdjustment(offsetY);
        return baseDepth + yAdjustment + this.zombieDepth;
    }

    public static getPlantBasicDepth(line: number): number {
        const baseDepth = this.getLineBaseDepth(line);
        return baseDepth + this.plantDepth;
    }

    /**
     * 计算发射物 sprite 的深度
     * @param type 发射物类型 ('bullet' | 'projectile' | 'laser')
     * @param line 行号（0 开始）
     * @param offsetY Y 方向偏移
     * @param componentOffset 单个发射物内部组件偏移
     * @returns 发射物的深度值
     */
    public static getProjectileDepth(
        type: 'bullet' | 'projectile' | 'laser',
        line: number,
        offsetY = 0,
        componentOffset = 0
    ): number {
        const baseDepth = this.getLineBaseDepth(line);
        const typeOffset = this.getProjectileTypeOffset(type);
        const yAdjustment = this.computeYOffsetAdjustment(offsetY);
        return baseDepth + typeOffset + yAdjustment + componentOffset;
    }

    /**
     * 获取菜单层级深度
     * @returns 菜单深度，最高 2,000,000
     */
    public static getMenuDepth(): number {
        return 2000000;
    }

    /**
     * 获取游戏内重要 UI 元素的深度
     * @param order 顺序索引（从 0 开始），例如 order=0 对应 1,900,000；order=9 对应 1,990,000
     * @returns 对应的 UI 元素深度
     */
    public static getInGameUIElementDepth(order: number): number {
        return 1900000 + order * 1000;
    }

    // 不重要的元素,
    public static getInGameUIUnImportant(order: number): number {
        return 1000 + order * 1;
    }
}
