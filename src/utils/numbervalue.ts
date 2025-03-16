export function GetIncValue(origin: number, ratio: number, level: number): number {
    // 计算常数c，公式：c = (ratio - 1) / log(9)
    const maxLevel = 9;
    const c = (ratio - 1) / Math.log(maxLevel);

    // 使用公式计算当前等级的伤害
    const damage = origin * (1 + c * Math.log(level));

    // 保留三位小数并返回
    return parseFloat(damage.toFixed(3));
}

export function GetDecValue(origin: number, ratio: number, level: number): number {
    // 计算常数c，公式：c = (1 - ratio) / log(maxLevel)
    const maxLevel = 9;
    const c = (1 - ratio) / Math.log(maxLevel);

    // 使用公式计算当前等级的冷却时间
    const cooldown = origin * (1 - c * Math.log(level));

    // 保留三位小数并返回
    return parseFloat(cooldown.toFixed(3));
}