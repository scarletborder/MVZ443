// presets/zombie/index.ts
import { MIRecord } from '../models/IRecord';
import CapZombieRecord from './old_monster/zombie/cap_zombie';
import EvokerRecord from './old_monster/zombie/evoker';
import ObsidianRecord from './old_monster/golem/golem_obsidian';
import HelmetZombieRecord from './old_monster/zombie/helmet_zombie';
import MinerHelmetZombieRecord from './old_monster/zombie/miner_helmet_zombie';
import MinerZombieRecord from './old_monster/zombie/miner_zombie';
import SkeletonRecord from './old_monster/zombie/skeleton';
import SkeletonBowRecord from './old_monster/zombie/skeleton_bow';
import StickZombieRecord from './old_monster/zombie/stick_zombie';
import VindicatorRecord from './old_monster/zombie/vindicator';
import VindicatorSoliderRecord from './old_monster/zombie/vindicator_solider';
import zombieRecord from './old_monster/zombie/zombie';
import WardenRecord from './old_monster/golem/warden';
import TurtleZombieRecord from './old_monster/zombie/turtle_zombie';
import { MutantRecord } from './old_monster/zombie_mutant/mutant';
import TurtleSkeletonBowRecord from './old_monster/zombie/turtle_skeleton_bow';

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
  13: WardenRecord,
  14: TurtleZombieRecord,
  15: MutantRecord,
  16: TurtleSkeletonBowRecord
}

