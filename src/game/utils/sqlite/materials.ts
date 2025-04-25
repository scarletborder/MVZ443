// src/api/materials.ts

import { publicUrl } from '../../../utils/browser';
import { SECKILL } from '../../../../public/constants';

// 定义材料需求类型
export interface MaterialRequirement {
    type: number;
    count: number;
}

// 用一个内存 Map 存放解析后的 CSV 数据，key = `${pid}_${level}`
let materialsMap: Record<string, MaterialRequirement[]> | null = null;

/**
 * 初始化“数据库”——从 CSV 拉取并解析到 materialsMap
 * @param filePath CSV 路径，默认指向 public/db/materials.csv
 */
async function initDb(filePath: string = `${publicUrl}/db/materials.csv`): Promise<void> {
    if (materialsMap) return;

    // 拉取 CSV
    const res = await fetch(filePath);
    if (!res.ok) throw new Error(`无法加载材料 CSV：${res.statusText}`);
    const text = await res.text();

    // 解析 CSV（假设格式规范，每行四个逗号分隔字段）
    const lines = text.trim().split('\n');
    // 第一行是表头，丢弃
    const rows = lines.slice(1);

    materialsMap = {};
    for (const row of rows) {
        const [pidStr, levelStr, typeStr, countStr] = row.split(',');
        const pidNum = Number(pidStr);
        const levelNum = Number(levelStr);
        const typeNum = Number(typeStr);
        const countNum = Number(countStr);

        const key = `${pidNum}_${levelNum}`;
        if (!materialsMap[key]) {
            materialsMap[key] = [];
        }
        materialsMap[key].push({
            type: typeNum,
            count: countNum
        });
    }
}

/**
 * 获取指定装备 pid 在指定等级 level 时的升级材料需求
 * @param pid 装备的唯一标识
 * @param level 装备升级目标等级
 * @returns MaterialRequirement 数组
 */
export async function getUpgradeMaterials(
    pid: number,
    level: number
): Promise<MaterialRequirement[]> {
    // 9级及以上走秒杀逻辑
    if (level >= 9) {
        return [{ type: SECKILL, count: 1 }];
    }

    // 确保 CSV 已经加载并解析
    if (!materialsMap) {
        await initDb();
    }

    const key = `${pid}_${level}`;
    const mats = materialsMap![key] ?? [];

    // 如果没有查到，返回默认
    if (mats.length === 0) {
        return [{ type: SECKILL, count: 1 }];
    }
    return mats;
}

// 示例：如何调用
(async () => {
    const pid = 1;
    const level = 2;
    const mats = await getUpgradeMaterials(pid, level);
    console.log(`装备 ${pid} 升级到等级 ${level} 需要的材料：`, mats);
})();
