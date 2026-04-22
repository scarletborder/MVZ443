export type _Typedebuffs = 'slow' | 'frozen' | null;

export type _TypeArrowEnhancement = 'none' | 'fire' | 'ice' | 'lightning';
export const DEBUG_TOGGLE_KEY = 'D';

export function EnhancementPriority(new_en: _TypeArrowEnhancement, old_en: _TypeArrowEnhancement): boolean {
  const priority = {
    'none': 0,
    'ice': 1,
    'fire': 2,
    'lightning': 3
  };
  return priority[new_en] > priority[old_en];
}

export const MonsterSpeed = {
  VindicatorSolider: 25,
  Mutant: 30,
  TurtleZombie: 35,
  Zombie: 35,
  Skeleton: 35,
  SkeletonBow: 35,
  MinerZombie: 35,
  MinerHelmetZombie: 35,
  CapZombie: 35,
  HelmetZombie: 35,
  TurtleSkeletonBow: 35,
  Evoker: 40,
  ObsidianGolem: 40,
  Warden: 40,
  Vindicator: 55,
  StickZombie: 60,
} as const;

export const ZombieAttackInterval = {
  Zombie: 200,
  CapZombie: 200,
  HelmetZombie: 200,
  MinerZombie: 200,
  MinerHelmetZombie: 200,
  Skeleton: 200,
  SkeletonBow: 200,
  StickZombie: 200,
  Evoker: 200,
  Vindicator: 200,
  VindicatorSolider: 200,
  TurtleZombie: 200,
  TurtleSkeletonBow: 200,
} as const;

