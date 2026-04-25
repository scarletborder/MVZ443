
import type { Game } from "../../scenes/Game";
import { CombatEntity } from "../core/CombatEntity";
import { ProjectileEntity } from "../entities/ProjectileEntity";
import { ExplosionConfig, ExplosionModel } from "./ProjectileModels";
import { PositionManager } from "../../managers/view/PositionManager";
import { SfxCmd } from "../../utils/cmd/SfxCmd";
import { ExplosionSfx } from "../../sfx/explosion/ExplosionSfx";

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
      SfxCmd.Create(ExplosionSfx, {
        scene: this.scene,
        x: this.x,
        y: this.y,
        totalWidth: this._explosionWidth,
        totalHeight: this._explosionHeight,
        leftWidth: this._explosionLeftWidth,
        downHeight: this._explosionDownHeight,
        baseSize: this._gridSizeX,
        viewGroup: this.viewGroup,
      });
    }
  }
}