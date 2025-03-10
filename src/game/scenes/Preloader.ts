import { Scene } from 'phaser';

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
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');

        // this.load.setPath('assets');
        // this.load.image('background', 'background.png'); // 请确保有背景资源
        // TODO: 移动到preload中
        this.load.image('bullet/snowball', 'bullet/snowball.png');
        this.load.image('bullet/arrow', 'bullet/arrow.png');


        this.load.image('plant/dispenser', 'plant/dispenser.png');
        this.load.spritesheet('plant/furnace', 'plant/furnace.png',
            { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('plant/obsidian', 'plant/obsidian.png',
            { frameWidth: 64, frameHeight: 64 });


        this.load.image('zombie/zombie', 'zombie/zombie.png');
        this.load.spritesheet('attach/cap', 'attach/cap.png',
            { frameWidth: 33, frameHeight: 14 });

        this.load.spritesheet('anime/death_smoke', 'anime/death_smoke.png',
            { frameWidth: 16, frameHeight: 16 });

        this.load.spritesheet('sprZombieBody', 'path/to/sprZombieBody.png',
            { frameWidth: 19, frameHeight: 35 }); // Adjust frameWidth if needed
        this.load.image('sprZombieHead', 'path/to/sprZombieHead.png');
        this.load.image('sprZombieArm', 'path/to/sprZombieArm.png'); // Single image, no sprite sheet
        this.load.image('sprZombieLeg', 'path/to/sprZombieLeg.png'); // Single image, no sprite sheet


        this.load.json('ch101', 'stages/ch101.json');
    }

    create() {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('Game');
    }
}
