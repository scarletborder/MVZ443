// 根据所有给定的资源进行加载

import { IRecord, MIRecord } from "../models/IRecord";
import DispenserRecord from "../presets/plant/dispenser";
import FurnaceRecord from "../presets/plant/furnace";
import ObsidianRecord from "../presets/plant/obsidian";
import CapZombieRecord from "../presets/zombie/cap_zombie";
import zombieRecord from "../presets/zombie/zombie";

// 例如选择的植物pid,这里会进行加载资源,和将对应种植函数放到实例里面,map<number, function>


export const PlantFactoryMap: Record<number, IRecord> = {
    1: DispenserRecord,
    2: FurnaceRecord,
    3: ObsidianRecord,
}


export const MonsterFactoryMap: Record<number, MIRecord> = {
    1: zombieRecord,
    2: CapZombieRecord,
}