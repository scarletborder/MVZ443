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
const chapter1_rainbowCave: _ResourceMapData = {
    bgimg: 'bg/bgRainbowCave1.png',
    bgm: 'audio/OLJA-0021-08.ogg',
}


// level to data
export const ResourceMapData: Map<number, _ResourceMapData> = new Map<number, _ResourceMapData>([
    [1, chapter1_village],
    [2, chapter1_outtermine],
    [3, chapter1_innermine],
    [4, chapter1_deepmine],
    [5, chapter1_deepmineWater],
    [6, chapter1_rainbowCave],
    [7, chapter1_innermine],
    [8, chapter1_deepmineWater],
    [9, chapter1_rainbowCave],
]);