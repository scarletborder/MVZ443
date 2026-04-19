import { _Typedebuffs } from "../../../constants/game";
import { FrameTimer } from "../../managers/combat/TickerManager";
import { PositionManager } from "../../managers/view/PositionManager";
import type { Game } from "../../scenes/Game";
import { Faction } from "../Enum";
import { IDamageable } from "../Interface";
import { BaseEntity } from "./BaseEntity";

export abstract class CombatEntity extends BaseEntity implements IDamageable {
  public currentHealth: number;
  public maxHealth: number;
  public faction: Faction;

  // 存储每个debuff的剩余时间和定时器
  protected debuffs: { [key: string]: { remaining: number, timer: FrameTimer } } = {};

  public ExtraData: Record<string, any> = {}; // 用于存储额外数据，供子类使用

  // 正在被这些东西（应该是monster）攻击
  public underAttackBy: Set<CombatEntity> = new Set<CombatEntity>(); // alias attackingZombie

  // 额外状态
  public isTiny = false; // 是否为小型单位，可能会被某些效果忽略

  constructor(scene: Game, x: number, y: number, maxHealth: number, faction: Faction) {
    super(scene, x, y);
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
    this.faction = faction;
  }

  public GetRow(): number {
    return PositionManager.Instance.getRowByY(this.y);
  }

  /**
   * 统一的受击逻辑
   * @param amount 伤害数值
   * @param dealer 伤害来源，如僵尸，植物， 矿车
   * @param source 伤害来源的具体对象（比如子弹/爆炸），可选
   */
  public takeDamage(amount: number, dealer?: BaseEntity, source?: BaseEntity): void {
    if (this.currentHealth <= 0) return;

    const realDamage = Math.min(amount, this.currentHealth);
    this.currentHealth -= amount;
    this.onHurt(amount, realDamage, dealer, source); // 提供给子类的钩子，用于播特效/音效

    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.die();
    }
  }

  // 供子类重写：受伤时的表现（比如植物闪烁，僵尸掉胳膊）
  protected abstract onHurt(amount: number, realDamage: number, dealer?: BaseEntity, source?: BaseEntity): void;

  // 死亡逻辑
  public die(): void {
    this.onDeath(); // 供子类重写：播死亡动画/掉落阳光
    this.destroy(); // 调用 BaseEntity 的清理
  }

  protected abstract onDeath(): void;

  public GetExtraData<T>(key: string): T | undefined {
    return this.ExtraData[key] as T;
  }

  // --- 泛用的 Debuff 逻辑 ---
  public addDebuff(_debuff: _Typedebuffs, _durationMs: number) {
    // TODO: 具体实现类似你写的 updateDebuffTime 逻辑...
  }

  protected removeDebuff(debuff: _Typedebuffs) {
    console.log(`removeDebuff: ${debuff}  now: ${Date.now()}`);
    if (debuff) {
      delete this.debuffs[debuff];
    }
  }

  /**
     * 根据debuff名字判断是否有debuff,如果有返回对应剩余时间(否则为0)
     * @param name debuff name
     * @returns 剩余时间(0表示没有debuff)
     */
  public hasDebuff(name: _Typedebuffs): number {
    if (name === null) return 0;

    try {
      if (this.debuffs[name]) {
        this.debuffs[name].remaining = Math.max(this.debuffs[name].timer.GetLeftTimeByMs(), 0);
      }
    } catch (error) {
      console.error("Error checking debuff status:", error);
    }
    return this.debuffs[name]?.remaining || 0;
  }
  protected clearAllDebuffs() { /* 遍历 debuffs 清除 timer */ }
}
