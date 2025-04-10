// utils/musical.ts
// 调节bgm播放

import { Game } from "../scenes/Game";

export default class Musical {
    private game: Game;
    private isBgm: boolean;

    // assets
    private music: Phaser.Sound.BaseSound;
    private dumpMusic: Phaser.Sound.BaseSound | null = null;


    constructor(game: Game, isBgm: boolean) {
        this.game = game;
        this.isBgm = isBgm; // 是否启用了bgm, 如果没有启动那么以下函数一律直接return
        if (!isBgm) {
            return;
        }
        this.music = this.game.sound.add('bgm', { loop: true });
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
        if (!this.isBgm) {
            return;
        }
        this.music.stop();
    }


}