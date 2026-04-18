import { Game } from "../../scenes/Game";
import { PhaserEventBus } from "../../EventBus";
import { BaseManager } from "../BaseManager";

export default class AudioManager extends BaseManager {
  private static _instance: AudioManager;
  protected scene: Game | null = null;

  private bgmKey: string | null = null;
  private bgmInstance: Phaser.Sound.WebAudioSound | Phaser.Sound.HTMLAudioSound | null = null;
  private sfxVolume: number = 1;
  private bgmVolume: number = 1;

  constructor() {
    super();
    PhaserEventBus.on('audio-settings-changed', this.handleAudioSettingsChanged, this);
  }

  public Load(): void { }

  public static get Instance(): AudioManager {
    if (!this._instance) {
      this._instance = new AudioManager();
    }
    return this._instance;
  }

  /**
   * 播放音效
   * @param key 音效资源key
   * @param volume 音量（0-1）
   */
  public playSFX(key: string, volume?: number): void {
    if (!this.scene) return;
    this.scene.sound.play(key, {
      volume: volume ?? this.sfxVolume,
    });
  }

  /**
   * 播放背景音乐
   * @param key 音乐资源key
   * @param loop 是否循环
   * @param volume 音量（0-1）
   */
  public playBGM(key: string, loop: boolean = true, volume?: number): void {
    if (!this.scene) return;

    // 停止当前背景音乐
    if (this.bgmInstance) {
      this.bgmInstance.stop();
    }

    this.bgmKey = key;
    this.bgmInstance = this.scene.sound.play(key, {
      volume: volume ?? this.bgmVolume,
      loop: loop,
    }) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTMLAudioSound;
  }

  /**
   * 停止背景音乐
   */
  public stopBGM(): void {
    if (this.bgmInstance) {
      this.bgmInstance.stop();
      this.bgmInstance = null;
      this.bgmKey = null;
    }
  }

  /**
   * 设置音效音量
   * @param volume 音量（0-1）
   */
  public setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 设置背景音乐音量
   * @param volume 音量（0-1）
   */
  public setBGMVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgmInstance) {
      this.bgmInstance.setVolume(this.bgmVolume);
    }
  }

  /**
   * 获取音效音量
   */
  public getSFXVolume(): number {
    return this.sfxVolume;
  }

  /**
   * 获取背景音乐音量
   */
  public getBGMVolume(): number {
    return this.bgmVolume;
  }

  /**
   * 暂停所有音效
   */
  public pauseAll(): void {
    if (!this.scene) return;
    this.scene.sound.pauseAll();
  }

  /**
   * 恢复所有音效
   */
  public resumeAll(): void {
    if (!this.scene) return;
    this.scene.sound.resumeAll();
  }

  /**
   * 停止所有音效
   */
  public stopAll(): void {
    if (!this.scene) return;
    this.scene.sound.stopAll();
  }

  public Reset(): void {
    this.stopAll();
    this.bgmKey = null;
    this.bgmInstance = null;
    this.scene = null;
  }

  private handleAudioSettingsChanged(data: { sfxVolume?: number; bgmVolume?: number }) {
    if (data.sfxVolume !== undefined) {
      this.setSFXVolume(data.sfxVolume);
    }
    if (data.bgmVolume !== undefined) {
      this.setBGMVolume(data.bgmVolume);
    }
  }
}
