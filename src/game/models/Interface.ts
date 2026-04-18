import { Faction } from "./Enum";

// 核心接口：任何可以被扣血的对象都必须实现这个接口
export interface IDamageable {
  currentHealth: number;
  faction: Faction;

  // dealer 代表伤害来源的实体（可能是植物、也可能是僵尸）
  // source 代表伤害来源（可能是子弹、也可能是僵尸直接啃咬）
  takeDamage(amount: number, dealer?: any, source?: any): void;
  die(): void;
}