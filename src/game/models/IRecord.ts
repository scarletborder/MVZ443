// plant
export interface IRecord {
    pid: number;
    name: string;
    cooldownTime: number;
    cost: number;
    NewFunction: Function;
    texture: string; // 也用于加载
};


// monster
export interface MIRecord {
    mid: number;
    name: string;
    NewFunction: Function;
    texture: string;
}