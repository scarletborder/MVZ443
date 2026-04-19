
import { defaultRandom } from "../../../utils/random";
import DepthUtils from "../../../utils/depth";
import type { Game } from "../../scenes/Game";
import { CombatEntity } from "../core/CombatEntity";
import { ProjectileEntity } from "../entities/ProjectileEntity";
import { ExplosionConfig, ExplosionModel } from "./ProjectileModels";
import { PositionManager } from "../../managers/view/PositionManager";

export class ExplosionEntity extends ProjectileEntity<ExplosionModel> {
  public baseDepth: number;

  private _explosionWidth: number = 0;
  private _explosionHeight: number = 0;
  private _explosionLeftWidth: number = 0;
  private _explosionDownHeight: number = 0;
  private _gridSizeX: number = 0;

  constructor(scene: Game, x: number, row: number, model: ExplosionModel, cfg: ExplosionConfig) {
    const y = (row + 1 / 2) * PositionManager.Instance.GRID_SIZEY + PositionManager.Instance.gridOffsetY;

    // 在 super 之前计算参数
    const gridSizeX = PositionManager.Instance.GRID_SIZEX;
    const gridSizeY = PositionManager.Instance.GRID_SIZEY;

    // 计算物理碰撞区域的长宽
    const rightWidth = cfg.rightGrid * gridSizeX;
    const leftWidth = cfg.leftGrid * gridSizeX;
    const upHeight = (cfg.upGrid + 1 / 3) * gridSizeY;
    const downHeight = ((cfg.downGrid ?? cfg.upGrid) + 1 / 3) * gridSizeY;

    const totalWidth = rightWidth + leftWidth;
    const totalHeight = upHeight + downHeight;

    // 计算出碰撞体的真正中心点偏移
    const centerX = x - leftWidth + (totalWidth / 2);
    const centerY = y - downHeight + (totalHeight / 2);

    super(scene, x, y, model, cfg);
    this.currentDamage = cfg.damage;

    // 临时改变 x, y 给物理体初始化
    const originalX = this.x; const originalY = this.y;
    this.x = centerX; this.y = centerY;
    this.createSensor(totalWidth, totalHeight);
    this.x = originalX; this.y = originalY; // 恢复视觉坐标系中心

    // 保存尺寸参数用于 buildView (buildView 已在 super 最后执行)
    this._explosionWidth = totalWidth;
    this._explosionHeight = totalHeight;
    this._explosionLeftWidth = leftWidth;
    this._explosionDownHeight = downHeight;
    this._gridSizeX = gridSizeX;

    // 在所有属性初始化后，调用视觉初始化
    this.initVisuals();

    // 110ms 后自动销毁物理体 (只生效极短时间)
    this.tickmanager.delayedCall({
      delay: 110,
      callback: () => this.destroy()
    });
  }

  buildView() {
    // buildView 在 super 最后执行，但属性是在 super 后赋值的
    // 所以这里不执行任何操作，真正的视觉初始化在 constructor 后完成
  }

  protected applyEffect(target: CombatEntity): void {
    this.hasAttacked.add(target);
    target.takeDamage(this.currentDamage, this.dealer, this);
    // debuff
    if (this.debuff) {
      target.addDebuff(this.debuff, this.debuffDuration);
    }
  }

  private initVisuals() {
    // 播放表现层动画
    if (!this.model.disableAnime) {
      this.playExplosionAnimations(
        this._explosionWidth,
        this._explosionHeight,
        this._explosionLeftWidth,
        this._explosionDownHeight,
        this._gridSizeX
      );
    }
  }

  private playExplosionAnimations(totalW: number, totalH: number, offsetL: number, offsetD: number, baseSize: number) {
    this.scene.musical.explodeAudio.play(`explode${Math.floor(Math.random() * 3) + 1}`);

    const spriteBaseSize = baseSize * 0.6;
    const cols = Math.ceil(totalW / spriteBaseSize);
    const rows = Math.ceil(totalH / spriteBaseSize);

    if (!this.scene.anims.exists('explosion')) {
      this.scene.anims.create({
        key: 'explosion',
        frames: this.scene.anims.generateFrameNumbers("anime/explosion", { start: 0, end: 15 }),
        frameRate: 30, repeat: 0
      });
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const baseX = this.x - offsetL + (col + 0.5) * spriteBaseSize;
        const baseY = this.y - offsetD + (row + 0.5) * spriteBaseSize;

        // 为了密度，每个格子随机生成 1~2 个爆炸动画
        for (let i = 0; i < (defaultRandom() < 0.5 ? 2 : 1); i++) {
          const finalX = baseX + (defaultRandom() - 0.5) * spriteBaseSize * 0.8;
          const finalY = baseY + (defaultRandom() - 0.5) * spriteBaseSize * 0.8;
          const scale = 0.8 + defaultRandom() * 0.6;

          const anime = this.scene.add.sprite(finalX, finalY, 'anime/explosion')
            .setDisplaySize(spriteBaseSize * scale, spriteBaseSize * scale)
            .setDepth(DepthUtils.getInGameUIElementDepth(-100))
            .setRotation(defaultRandom() * Math.PI * 2);

          this.viewGroup.add(anime);

          this.scene.time.delayedCall(150 * defaultRandom(), () => {
            if (!anime.scene) return;
            anime.play('explosion');
            anime.once('animationcomplete', () => anime.destroy());
          });
        }
      }
    }
  }
}