// presets/zombie/index.ts
import { MIRecord } from '../../models/IRecord';
import CapZombieRecord from './cap_zombie';
import HelmetZombieRecord from './helmet_zombie';
import MinerHelmetZombieRecord from './miner_helmet_zombie';
import MinerZombieRecord from './miner_zombie';
import SkeletonRecord from './skeleton';
import SkeletonBowRecord from './skeleton_bow';
import zombieRecord from './zombie';

const MonsterFactoryMap: Record<number, MIRecord> = {
    1: zombieRecord,
    2: CapZombieRecord,
    3: HelmetZombieRecord,
    4: MinerZombieRecord,
    5: MinerHelmetZombieRecord,
    6: SkeletonRecord,
    7: SkeletonBowRecord,
}

export default MonsterFactoryMap;