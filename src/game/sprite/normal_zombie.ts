import { Game } from "../scenes/Game";
import IZombieAnim, { ZombieAnimProps } from "./zombie";

const NormalZombieAnimProps: ZombieAnimProps = {
    Species: 'Zombie',
    bodyKey: 'sprZombieBody',
    headKey: 'sprZombieHead',
    armKey: 'sprZombieArm',
    legKey: 'sprZombieLeg',
}

class NormalZombieAnim extends IZombieAnim {
    constructor(scene: Game, x: number, y: number) {
        super(scene, x, y, NormalZombieAnimProps);
    }

}

export function newNormalZombieAnim(scene: Game, x: number, y: number) {
    return new NormalZombieAnim(scene, x, y);
};

const NormalSkeletonAnimProps: ZombieAnimProps = {
    Species: 'Skeleton',
    bodyKey: 'sprSkeletonBody',
    headKey: 'sprSkeletonHead',
    armKey: 'sprSkeletonArm',
    legKey: 'sprSkeletonLeg',
}

class NormalSkeletonAnim extends IZombieAnim {
    constructor(scene: Game, x: number, y: number) {
        super(scene, x, y, NormalSkeletonAnimProps);
    }

}

export function newNormalSkeletonAnim(scene: Game, x: number, y: number) {
    return new NormalSkeletonAnim(scene, x, y);
};