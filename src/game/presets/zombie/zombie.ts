// src/game/sprites/NewZombie.ts
import { Game } from '../../scenes/Game';
import { IZombie } from '../../models/IZombie';
import { IPlant } from '../../models/IPlant';

function NewZombie(scene: Game, x: number, y: number): IZombie {
    const zombie = new IZombie(scene, x, y, 'zombie/zombie');
    zombie.health = 2000; // 设置初始血量（覆盖默认值 20）
    zombie.speed = 90;

    zombie.setVelocityX(-zombie.speed); // 初始向左移动

    console.log('New Zombie created');
    return zombie;
}

export default NewZombie;
