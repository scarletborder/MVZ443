import { Scene } from 'phaser';
import { GameParams } from '../models/GameParams';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }



    init() {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload() {
        const params = this.game.registry.get('gameParams') as GameParams;
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');
        this.loadStage(params.level);
    }

    create() {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('Game');
    }

    // 加载全部器械
    loadAllPlant() {
        this.load.image('plant/dispenser', 'plant/dispenser.png');
        this.load.spritesheet('plant/furnace', 'plant/furnace.png',
            { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('plant/obsidian', 'plant/obsidian.png',
            { frameWidth: 64, frameHeight: 64 });
        this.load.image('plant/small_dispenser', 'plant/small_dispenser.png');
    }

    // 加载全部怪物
    loadAllMonster() {
        this.load.image('zombie/zombie', 'zombie/zombie.png');
        this.load.spritesheet('attach/cap', 'attach/cap.png',
            { frameWidth: 33, frameHeight: 14 });
    }

    // 加载全部发射物
    loadAllProjectile() {
        this.load.image('bullet/snowball', 'bullet/snowball.png');
        this.load.image('bullet/arrow', 'bullet/arrow.png');
        this.load.image('bullet/minecart', 'bullet/minecart.png');
    }

    // 加载全部sprite
    loadAllSprite() {
        this.load.image('pickaxe', 'sprite/pickaxe.png');
        this.load.spritesheet('anime/death_smoke', 'anime/death_smoke.png',
            { frameWidth: 16, frameHeight: 16 });

        this.load.spritesheet('sprZombieBody', 'sprite/zombie/sprZombieBody.png',
            { frameWidth: 19, frameHeight: 35 }); // Adjust frameWidth if needed
        this.load.image('sprZombieHead', 'sprite/zombie/sprZombieHead.png');
        this.load.image('sprZombieArm', 'sprite/zombie/sprZombieArm.png'); // Single image, no sprite sheet
        this.load.image('sprZombieLeg', 'sprite/zombie/sprZombieLeg.png'); // Single image, no sprite sheet
    }

    // 加载指定关卡
    loadStage(stageId: number) {
        console.log(`Loading stage ${stageId}`);
        // 1. 加载关卡数据
        this.load.json(`ch${stageId}`, `../stages/ch${stageId}.json`);
        // 2. 加载关卡怪物
        this.loadAllMonster();
        // 3. 加载关卡植物
        this.loadAllPlant();
        // 4. 加载关卡发射物
        this.loadAllProjectile();

        this.loadAllSprite();

    }
}
