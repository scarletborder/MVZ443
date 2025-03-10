export const VERSION = `0.0.1`

export const updateContent = `
    v0.0.1 - 初始版本发布
    - 3种器械,2种僵尸,2种bullet
    - 包含测试关卡
    - 图鉴
    - 存档管理
    - 出怪表机制
`;

export const announcement =
    '游戏仍在开发中, 当前状态不代表最终品质'

export const MAXDEPTH = 10000;

// 從上往下,0,1,2,3
export const LINE_DEPTH = (line: number) => {
    return (line + 2) * line;
}

export const BULLET_DEPTH = 20;
export const PROJECTILE_DEPTH = 30;
export const PLANT_DEPTH = 40;
export const ZOMBIE_DEPTH = 50;
export const LASER_DEPTH = 60;
