// presets/zombie/index.ts
import { MIRecord } from '../models/IRecord';
import CapZombieRecord from './zombie/cap_zombie';
import EvokerRecord from './zombie/evoker';
import ObsidianRecord from './golem/golem_obsidian';
import HelmetZombieRecord from './zombie/helmet_zombie';
import MinerHelmetZombieRecord from './zombie/miner_helmet_zombie';
import MinerZombieRecord from './zombie/miner_zombie';
import SkeletonRecord from './zombie/skeleton';
import SkeletonBowRecord from './zombie/skeleton_bow';
import StickZombieRecord from './zombie/stick_zombie';
import VindicatorRecord from './zombie/vindicator';
import VindicatorSoliderRecord from './zombie/vindicator_solider';
import zombieRecord from './zombie/zombie';
import WardenRecord from './golem/warden';

export const MonsterFactoryMap: Record<number, MIRecord> = {
    1: zombieRecord,
    2: CapZombieRecord,
    3: HelmetZombieRecord,
    4: MinerZombieRecord,
    5: MinerHelmetZombieRecord,
    6: SkeletonRecord,
    7: SkeletonBowRecord,
    8: StickZombieRecord,
    9: EvokerRecord,
    10: VindicatorRecord,
    11: VindicatorSoliderRecord,
    12: ObsidianRecord,
    13: WardenRecord
}

