const maxLevel = 9;

export function GetIncValue(origin: number, ratio: number, level: number): number {
  // 计算常数c，公式：c = (ratio - 1) / log(9)
  const c = (ratio - 1) / Math.log(maxLevel);

  // 使用公式计算当前等级的伤害
  const damage = origin * (1 + c * Math.log(level));

  // 保留三位小数并返回
  return parseFloat(damage.toFixed(3));
}

export function GetDecValue(origin: number, ratio: number, level: number): number {
  // 计算常数c，公式：c = (1 - ratio) / log(maxLevel)
  const c = (1 - ratio) / Math.log(maxLevel);

  // 使用公式计算当前等级的冷却时间
  const cooldown = origin * (1 - c * Math.log(level));

  // 保留三位小数并返回
  return parseFloat(cooldown.toFixed(3));
}

// 初始等级为0

export class PlantStat {
  private base: number;
  private incRatio: number | null = null;
  private decRatio: number | null = null;
  private levelThresholds: Record<number, number> = {};

  constructor(base: number) {
    this.base = base;
  }

  public setIncRatio(ratio: number): this {
    this.incRatio = ratio;
    return this;
  }

  public setDecValue(ratio: number): this {
    this.decRatio = ratio;
    return this;
  }

  public setThreshold(level: number, value: number): this {
    this.levelThresholds[level] = value;
    return this;
  }

  public getValueAt(level: number): number {
    let appliedBase = this.base;
    let effectiveLevel = level;

    // 查找当前等级对应的最高阈值
    let maxAppliedLevel = 0;
    for (const [lvlStr, val] of Object.entries(this.levelThresholds)) {
      const lvl = parseInt(lvlStr);
      if (level >= lvl && lvl > maxAppliedLevel) {
        appliedBase = val;
        maxAppliedLevel = lvl;
      }
    }

    // 如果有阈值，计算距离阈值点的等级差
    // 若 level == maxAppliedLevel，effectiveLevel 为 1，函数返回 appliedBase
    if (maxAppliedLevel > 0) {
      effectiveLevel = level - maxAppliedLevel + 1;
    }

    if (this.incRatio !== null) {
      return GetIncValue(appliedBase, this.incRatio, effectiveLevel);
    }

    if (this.decRatio !== null) {
      return GetDecValue(appliedBase, this.decRatio, effectiveLevel);
    }

    return appliedBase;
  }
}

/**
 * 
// 基础 100，每级伤害增加，5级突变为 300
const stat = new PlantStat(100)
  .setIncRatio(1.5) 
  .setThreshold(5, 300);

// Level 1: 基础值
console.log("L1:", stat.getValueAt(1)); // 100

// Level 4: 正常的对数增长 (基于 100)
console.log("L4:", stat.getValueAt(4)); // 100 * (1 + c * log(4)) ≈ 128.847

// Level 5: 发生突变 (直接返回 300)
console.log("L5:", stat.getValueAt(5)); // 300

// Level 6: 基于 300 的第二次增长
// effectiveLevel = 6 - 5 + 1 = 2
console.log("L6:", stat.getValueAt(6)); // 300 * (1 + c * log(2)) ≈ 315.659
 */