export const VERSION = `0.0.2`;

export const announcement =
    `游戏仍在开发中, 当前状态不代表最终品质.
    
当前版本联机功能,每次完成一局游戏需要重新连接,因为后端刷新了状态

使用 go build 构建服务器,并在游戏中地址栏输入 ws://127.0.0.1:28080/ws 进行连接(星之碎片尚未实现同步,联机游戏请别使用)

通过过关获得更多器械,目前进度以至chapter1-stage5,剧情仍然在完善中

精英模式剧情已经展示,实装在下一个体验版本
`


export const SECKILL = 99889988;


type _ResourceMapData = {
    bgimg: string;
    bgm: string;
}

const chapter1_village: _ResourceMapData = {
    bgimg: 'bg/bgDay.png',
    bgm: 'audio/QLCK-002-05.mp3',
}
const chapter1_outtermine: _ResourceMapData = {
    bgimg: 'bg/bgOutterMine.png',
    bgm: 'audio/QLCK-002-05.mp3',
}
const chapter1_innermine: _ResourceMapData = {
    bgimg: 'bg/bgInnerMine.png',
    bgm: 'audio/ARCD-0036-09.ogg',
}
const chapter1_deepmine: _ResourceMapData = {
    bgimg: 'bg/bgDeepMine.png',
    bgm: 'audio/OLJA-0021-08.ogg',
}
const chapter1_deepmineWater: _ResourceMapData = {
    bgimg: 'bg/bgDeepMineWater.png',
    bgm: 'audio/OLJA-0021-08.ogg',
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