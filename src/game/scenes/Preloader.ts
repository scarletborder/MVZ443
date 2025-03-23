import { Scene } from 'phaser';
import { GameParams } from '../models/GameParams';
import { ResourceMapData } from '../../constants/map_data';
import { EventBus } from '../EventBus';
import PlantFactoryMap from '../presets/plant';
import { HasConnected } from '../../utils/net/sync';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    loadbg: Phaser.GameObjects.Image


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
        this.loadStage(params);
    }

    create() {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        // this.loadbg.destroy();
        for (let i = 0; i < 10; ++i) {
            EventBus.emit('starshards-consume');
        }
        this.scene.start('Game');
    }

    // 加载全部器械
    loadAllPlant(ids: number[]) {
        if (HasConnected()) {
            // 联机模式全部加载
            const allRecords = Object.values(PlantFactoryMap);
            for (const record of allRecords) {
                this.load.spritesheet(record.texture, record.texture + '.png', {
                    frameWidth: 64, frameHeight: 64
                });
            }

            return;
        }
        for (const id of ids) {
            const texture = PlantFactoryMap[id].texture;
            this.load.spritesheet(texture, texture + '.png', {
                frameWidth: 64, frameHeight: 64
            });
        }
    }

    // 加载全部怪物
    loadAllMonster() {
        this.load.image('zombie/zombie', 'zombie/zombie.png');
        this.load.spritesheet('attach/cap', 'attach/cap.png',
            { frameWidth: 33, frameHeight: 14 });
        this.load.spritesheet('attach/helmet', 'attach/helmet.png',
            { frameWidth: 33, frameHeight: 14 });
        this.load.spritesheet('attach/turtle', 'attach/turtle.png',
            { frameWidth: 33, frameHeight: 14 });
        this.load.image('attach/hd_pickaxe', `attach/hd_pickaxe.png`);
        this.load.image('attach/hd_bow', `attach/hd_bow.png`);
        this.load.image('attach/hd_stick', `attach/hd_stick.png`);
        this.load.image('attach/hd_axe', `attach/hd_axe.png`);
        this.load.spritesheet('attach/hd_shield', `attach/hd_shield.png`,
            { frameWidth: 32, frameHeight: 32 });


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
        this.load.image('starshards', 'sprite/star.png');
        this.load.spritesheet('anime/death_smoke', 'anime/death_smoke.png',
            { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('anime/explosion', 'anime/explosion.png',
            { frameWidth: 32, frameHeight: 32 });
        this.load.image('shoot_bomb', 'anime/shoot_bomb.png');
        this.load.spritesheet('anime/dirt_out', 'anime/dirt_out.png',
            { frameWidth: 64, frameHeight: 64 });
        this.load.image('anime/dirt', 'anime/dirt.png');


        this.load.spritesheet('sprZombieBody', 'sprite/zombie/sprZombieBody.png',
            { frameWidth: 19, frameHeight: 35 }); // Adjust frameWidth if needed
        this.load.image('sprZombieHead', 'sprite/zombie/sprZombieHead.png');
        this.load.image('sprZombieArm', 'sprite/zombie/sprZombieArm.png'); // Single image, no sprite sheet
        this.load.image('sprZombieLeg', 'sprite/zombie/sprZombieLeg.png'); // Single image, no sprite sheet

        this.load.spritesheet('sprSkeletonBody', `sprite/skeleton/sprSkeletonBody.png`,
            { frameWidth: 19, frameHeight: 35 });
        this.load.image('sprSkeletonHead', `sprite/skeleton/sprSkeletonHead.png`);
        this.load.image('sprSkeletonArm', `sprite/skeleton/sprSkeletonArm.png`);
        this.load.image('sprSkeletonLeg', `sprite/skeleton/sprSkeletonLeg.png`);

        this.load.spritesheet('sprEvokerBody', `sprite/evoker/sprEvokerBody.png`,
            { frameWidth: 19, frameHeight: 35 });
        this.load.image('sprEvokerHead', `sprite/evoker/sprEvokerHead.png`);
        this.load.image('sprEvokerArm', `sprite/evoker/sprEvokerArm.png`);
        this.load.image('sprEvokerLeg', `sprite/evoker/sprEvokerLeg.png`);

        this.load.spritesheet('sprVindicatorBody', `sprite/vindicator/sprVindicatorBody.png`,
            { frameWidth: 19, frameHeight: 35 });
        this.load.image('sprVindicatorHead', `sprite/evoker/sprEvokerHead.png`);
        this.load.image('sprVindicatorArm', `sprite/vindicator/sprVindicatorArm.png`);
        this.load.image('sprVindicatorLeg', `sprite/vindicator/sprVindicatorLeg.png`);

        this.load.spritesheet('obsidianBody', 'sprite/obsidian_golem/obsidianBody.png',
            { frameWidth: 19, frameHeight: 35 });
        this.load.image('obsidianHead', 'sprite/obsidian_golem/obsidianHead.png');
        this.load.image('obsidianArm', 'sprite/obsidian_golem/obsidianArm.png');
        this.load.image('obsidianLeg', 'sprite/obsidian_golem/obsidianLeg.png');

        this.load.image('zombie/mob_obsidian', 'zombie/mob_obsidian.png');

        this.load.spritesheet('sprWardenBody', 'sprite/warden_golem/sprWardenBody.png',
            { frameWidth: 19, frameHeight: 35 });
        this.load.image('sprWardenHead', 'sprite/warden_golem/sprWardenHead.png');
        this.load.image('sprWardenArm', 'sprite/warden_golem/sprWardenArm.png');
        this.load.image('sprWardenLeg', 'sprite/warden_golem/sprWardenLeg.png');
    }

    // 加载bgimg和bgm 
    loadBackground(stageId: number) {
        const mapdata = ResourceMapData.get(stageId);
        this.load.image('bgimg', mapdata?.bgimg);
        this.load.audio('bgm', mapdata?.bgm);
        // this.load.image('bgpix1', 'bg/bgPaper1.png');
        // this.load.image('bgpix3', 'bg/bgPaper3.png');
    }

    // 加载指定关卡
    loadStage(params: GameParams) {
        const stageId = params.level;
        console.log(`Loading stage ${stageId}`);
        // 1. 加载关卡数据
        this.load.json(`ch${stageId}`, `../stages/ch${stageId}.json`);
        // 2. 加载关卡怪物
        this.loadAllMonster();
        // 3. 加载关卡植物
        this.loadAllPlant(params.plants);
        // 4. 加载关卡发射物
        this.loadAllProjectile();
        // 5. 加载关卡地图
        this.loadBackground(stageId);

        this.loadAllSprite();

        // 关卡特定加载
        this.loadStageSpecified(stageId);
    }

    loadStageSpecified(stageId: number) {
        if (stageId === 1 || stageId === 6) {
            // 加载熔炉和发射器
            if (!this.textures.exists('plant/furnace')) {
                this.load.spritesheet('plant/furnace', 'plant/furnace.png', {
                    frameWidth: 64,
                    frameHeight: 64
                });
            }

            if (!this.textures.exists('plant/dispenser')) {
                this.load.spritesheet('plant/dispenser', 'plant/dispenser.png', {
                    frameWidth: 64,
                    frameHeight: 64
                });
            }
        }

        if (stageId === 6 || stageId === 7) {
            this.load.audio('ZCDS-0014-05', 'audio/ZCDS-0014-05.ogg');
        }
    }
}
