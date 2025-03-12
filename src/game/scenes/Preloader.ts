import { Scene } from 'phaser';
import { GameParams } from '../models/GameParams';
import { ResourceMapData } from '../../../public/constants';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    loadbg: Phaser.GameObjects.Image
    loadprogress: any



    init() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 计算进度条宽度（例如占屏幕宽度的80%）
        const progressBarWidth = width * 0.8;
        const progressBarHeight = 32;
        const progressBarX = width / 2;
        const progressBarY = height / 2;

        // 背景图

        // 显示进度条外框
        this.add.rectangle(progressBarX, progressBarY, progressBarWidth, progressBarHeight).setStrokeStyle(1, 0xffffff);

        // 进度条本身
        const bar = this.add.rectangle(progressBarX - (progressBarWidth / 2) + 2, progressBarY, 4, 28, 0xffffff);

        // 使用加载器的'progress'事件来更新进度条
        this.load.on('progress', (progress: number) => {
            // 计算进度条的宽度，根据加载进度来调整
            bar.width = 4 + (progressBarWidth - 8) * progress; // 8是留出的边距（2px*4）
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
        // this.loadbg.destroy();
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

    // 加载bgimg和bgm 
    loadBackground(stageId: number) {
        let mapdata = ResourceMapData.get(stageId);
        this.load.image('bgimg', mapdata?.bgimg);
        this.load.audio('bgm', mapdata?.bgm);
        // this.load.image('bgpix1', 'bg/bgPaper1.png');
        // this.load.image('bgpix3', 'bg/bgPaper3.png');
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
        // 5. 加载关卡地图
        this.loadBackground(stageId);

        this.loadAllSprite();

    }
}
