// utils/musical.ts
// 调节bgm播放

import Phaser from 'phaser';
import { Game } from "../scenes/Game";

export default class Musical {
    private game: Game;
    private isBgm: boolean;

    // assets
    private music: Phaser.Sound.BaseSound;
    private dumpMusic: Phaser.Sound.BaseSound | null = null;

    plantAudio: ThrottledAudio; // 植物音效节流

    shootArrowPool: AudioPool; // 射箭音效池

    zombieSpawnAudio: ThrottledAudio; // 僵尸出生音效节流
    zombieDeathPool: AudioPool; // 僵尸死亡音效池
    generalHitAudio: ThrottledAudio; // 怪物受伤音效节流
    skeletonSpawnAudio: ThrottledAudio; // 骷髅出生音效节流
    skeletonDeathPool: AudioPool; // 骷髅死亡音效池
    shieldHitAudio: ThrottledAudio; // 通用防具音效节流


    constructor(game: Game, isBgm: boolean, isSound: boolean) {
        this.game = game;
        this.isBgm = isBgm; // 是否启用了bgm, 如果没有启动那么以下函数一律直接return

        // bgm
        if (isBgm) {
            this.music = this.game.sound.add('bgm', { loop: true });
        }

        // 音效 
        const isMuted = !isSound; // 静音

        this.plantAudio = new ThrottledAudio(this.game, 200, isMuted); // 植物音效节流
        this.shootArrowPool = new AudioPool(this.game, 'sfx', 'shootArrow', 4, isMuted);
        this.zombieSpawnAudio = new ThrottledAudio(this.game, 1500, isMuted);
        this.zombieDeathPool = new AudioPool(this.game, 'sfx', 'zombieDeath', 4, isMuted);
        this.skeletonSpawnAudio = new ThrottledAudio(this.game, 1500, isMuted);
        this.skeletonDeathPool = new AudioPool(this.game, 'sfx', 'skeletonDeath', 4, isMuted);
        this.generalHitAudio = new ThrottledAudio(this.game, 200, isMuted);
        this.shieldHitAudio = new ThrottledAudio(this.game, 200, isMuted);
    }

    public playCurrent() {
        if (!this.isBgm) {
            return;
        }
        this.music.play();
    }

    /**
     * 覆盖bgm,同时dump原先,用于boss战
     * @param key 
     * @returns 
     */
    public coverCurrent(key: string) {
        if (!this.isBgm) {
            return;
        }

        // 暂停和保存当前的bgm
        this.music.pause();
        this.dumpMusic = this.music;
        // 播放新的bgm
        this.music = this.game.sound.add(key, { loop: true });
        this.music.play();
    }

    /**
     * 换到dumpMusic,同时删除当前的bgm,
     * 用于boss战结束后
     */
    public backToDump() {
        if (!this.isBgm) {
            return;
        }

        this.music.stop();
        if (this.dumpMusic) {
            this.music = this.dumpMusic;
            this.dumpMusic = null;
            this.music.resume();
        }
    }

    public pause() {
        if (!this.isBgm) {
            return;
        }
        this.music.pause();
    }

    public resume() {
        if (!this.isBgm) {
            return;
        }
        this.music.resume();
    }

    public destroy() {
        if (this.isBgm) {
            this.music.stop();
        }
    }
}


// src/audio/ThrottledAudio.ts

export class ThrottledAudio {
    isMuted: boolean = false;
    private scene: Phaser.Scene;
    private lastPlayTime: Map<string, number> = new Map();
    private throttleDelay: number; // 单位：毫秒

    constructor(scene: Phaser.Scene, throttleDelay: number = 200, isMuted = false) {
        this.isMuted = isMuted;
        this.scene = scene;
        this.throttleDelay = throttleDelay;
    }

    play(key: string, config?: Phaser.Types.Sound.SoundConfig) {
        const now = this.scene.time.now;
        const last = this.lastPlayTime.get(key) ?? 0;
        if (now - last < this.throttleDelay) {
            return; // 距离上次播放未超过节流时间，忽略
        }
        this.lastPlayTime.set(key, now);

        const volume = this.isMuted ? 0 : 1;
        this.scene.sound.playAudioSprite('sfx', key, { ...config, volume });
    }
}


// src/audio/AudioPool.ts
interface PoolItem {
    sound: Phaser.Sound.BaseSound;
    inUse: boolean;
}

export class AudioPool {
    private scene: Phaser.Scene;
    private pool: PoolItem[] = [];
    private markerName: string;
    private isMuted: boolean = false;

    /**
     * @param scene      当前场景
     * @param spriteKey  在 preload 中 load.audioSprite 时的 key，比如 'sfx'
     * @param markerName audioSprite JSON 里定义的 marker 名称，比如 'attack'
     * @param poolSize   声道数量，默认 4
     */
    constructor(
        scene: Phaser.Scene,
        spriteKey: string,
        markerName: string,
        poolSize: number = 4,
        isMuted = false
    ) {
        this.isMuted = isMuted;
        this.scene = scene;
        this.markerName = markerName;

        // 预创建若干 AudioSprite 实例
        for (let i = 0; i < poolSize; i++) {
            // addAudioSprite 返回一个 BaseSound（可能是 WebAudioSound / HTML5AudioSound 等）&#8203;:contentReference[oaicite:0]{index=0}
            const snd = this.scene.sound.addAudioSprite(spriteKey);
            this.pool.push({ sound: snd, inUse: false });
        }
    }

    /**
     * 播放一个空闲声道
     * @param loop   是否循环
     * @param config 其他 SoundConfig（volume、rate 等）
     */
    play(
        loop: boolean = false,
        config: Phaser.Types.Sound.SoundConfig = {}
    ): Phaser.Sound.BaseSound | null {
        const item = this.pool.find(i => !i.inUse);
        if (!item) {
            return null;
        }

        item.inUse = true;
        // 播放完毕后回收
        item.sound.once('complete', () => {
            item.inUse = false;
        });

        // 应用全局静音，并设置循环
        const volume = this.isMuted ? 0 : 1;

        // BaseSound.play(markerName, config) 支持第一个参数传入 marker 名称&#8203;:contentReference[oaicite:1]{index=1}
        item.sound.play(this.markerName, {
            ...config,
            volume,
            loop
        });

        return item.sound;
    }

    /**
     * 停止并重置所有正在使用的声道
     */
    stopAll() {
        this.pool.forEach(item => {
            if (item.inUse) {
                item.sound.stop();
                item.inUse = false;
            }
        });
    }
}
