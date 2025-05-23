import { Scene } from 'phaser';
import { GameParams } from '../models/GameParams';
import { EventBus } from '../EventBus';
import PlantFactoryMap from '../presets/plant';
import { HasConnected } from '../../utils/net/sync';
import { preloadData, StageData } from '../models/IRecord';

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

        this.load.image('attach/sign', 'attach/sign.png');

        this.load.image('attach/boat1', 'attach/sprBoat/sprBoat_0.png');
        this.load.image('attach/boat2', 'attach/sprBoat/sprBoat_1.png');


    }

    // 加载全部发射物
    loadAllProjectile() {
        this.load.image('bullet/snowball', 'bullet/snowball.png');
        this.load.image('bullet/arrow', 'bullet/arrow.png');
        this.load.image('bullet/minecart', 'bullet/minecart.png');
        this.load.image('bullet/firework', 'bullet/firework.png');
        this.load.image('bullet/Hfirework', 'bullet/Hfirework.png');

    }

    // 加载全部sprite
    loadAllSprite() {
        this.load.image('pickaxe', 'sprite/pickaxe.png');
        this.load.image('starshards', 'sprite/star.png');
        this.load.spritesheet('anime/death_smoke', 'anime/death_smoke.png',
            { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('anime/explosion', 'anime/explosion.png',
            { frameWidth: 32, frameHeight: 32 });

        this.load.spritesheet('anime/fire', 'anime/fire.png',
            { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('anime/ice_trail', 'anime/ice_trail.png',
            { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('anime/lightning_trail', 'anime/lightning_trail.png',
            { frameWidth: 16, frameHeight: 16 });


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

        this.load.spritesheet('sprMutantBody', 'sprite/mutant/body.png',
            { frameWidth: 52, frameHeight: 89 });
        this.load.image('sprMutantHead', 'sprite/mutant/head.png');
        this.load.image('sprMutantUpperArm', 'sprite/mutant/upperArm.png');
        this.load.image('sprMutantLowerArm', 'sprite/mutant/lowerArm.png');
        this.load.image('sprMutantUpperLeg', 'sprite/mutant/upperLeg.png');
        this.load.image('sprMutantLowerLeg', 'sprite/mutant/lowerLeg.png');
        this.load.image('sprMutantCover', 'sprite/mutant/cover.png');
    }


    // 加载指定关卡
    loadStage(params: GameParams) {
        const stageId = params.level;
        console.log(`Loading stage ${stageId}`);
        // 1. 加载关卡数据
        this.load.json(`ch${stageId}`, `../stages/ch${stageId}.json`);
        this.load.once(`filecomplete-json-ch${stageId}`, (key: string, type: any, data: StageData) => {
            // 关卡特定加载
            this.loadStageSpecified(data.load, params);
        });
        // 2. 加载关卡怪物
        this.loadAllMonster();
        // 3. 加载关卡植物
        this.loadAllPlant(params.plants);
        // 4. 加载关卡发射物
        this.loadAllProjectile();

        // 5. 加载所有附着物
        this.loadAllSprite();
        // 6. 加载音频
        this.load.audioSprite(
            'sfx',
            'audio/sounds/sfx-sprite.json',
            'audio/sounds/sfx-sprite.ogg',
        );
    }

    loadStageSpecified(preloadData: preloadData, params: GameParams) {
        // 加载关卡地图 & bgm
        this.load.image('bgimg', preloadData.bgimg[0]);
        this.load.audio('bgm', preloadData.bgm[0]);
        // 如果有多余的bgimg和bgm,则加载
        for (let i = 1; i < preloadData.bgimg.length; ++i) {
            this.load.image(`bgimg${i}`, preloadData.bgimg[i]);
        }
        if (params.gameSettings.isBgm) {
            for (let i = 1; i < preloadData.bgm.length; ++i) {
                this.load.audio(`bgm${i}`, preloadData.bgm[i]);
            }
        }

        // 预先需要加载的器械
        for (const plantID of preloadData.plants || []) {
            const texture = PlantFactoryMap[plantID].texture;
            if (this.textures && !this.textures.exists(texture)) {
                this.load.spritesheet(texture, texture + '.png', {
                    frameWidth: 64, frameHeight: 64
                });
            }
        }
    }
}
