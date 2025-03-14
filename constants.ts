export const VERSION = `0.0.1`

export const updateContent = `
    v0.0.1 - 初始版本发布
    - 3种器械,2种僵尸,2种bullet
    - 包含测试关卡
    - 图鉴
    - 存档管理
    - 出怪表机制

2025.3.7: 启程
`;

export const announcement =
    `游戏仍在开发中, 当前状态不代表最终品质.
    
当前版本联机功能,每次完成一局游戏需要重新连接,因为后端刷新了状态

使用 go build 构建服务器,并在游戏中地址栏输入 ws://127.0.0.1:28080/ws 进行连接

通过过关获得更多器械,目前进度以至chapter1-stage2,剧情仍然在完善中`


export const SECKILL = 99889988;


type _ResourceMapData = {
    bgimg: string;
    bgm: string;
}

const chapter1_village: _ResourceMapData = {
    bgimg: 'bg/bgDay.png',
    bgm: 'audio/AREP-0005-03.ogg',
}
const chapter1_outtermine: _ResourceMapData = {
    bgimg: 'bg/bgOutterMine.png',
    bgm: 'audio/AREP-0005-03.ogg',
}
const chapter1_innermine: _ResourceMapData = {
    bgimg: 'bg/bgInnerMine.png',
    bgm: 'audio/AREP-0005-03.ogg',
}
const chapter1_deepmine: _ResourceMapData = {
    bgimg: 'bg/bgDeepMine.png',
    bgm: 'audio/AREP-0005-03.ogg',
}
const chapter1_deepmineWater: _ResourceMapData = {
    bgimg: 'bg/bgDeepMineWater.png',
    bgm: 'audio/AREP-0005-03.ogg',
}
const chapter1_boss: _ResourceMapData = {
    bgimg: 'bg/bgBoss.png',
    bgm: 'audio/AREP-0005-03.ogg',
}


// level to data
export const ResourceMapData: Map<number, _ResourceMapData> = new Map<number, _ResourceMapData>([
    [1, chapter1_village],
    [2, chapter1_outtermine],
    [3, chapter1_innermine],
    [4, chapter1_deepmine],
    [5, chapter1_deepmineWater],
    [6, chapter1_boss],
]);