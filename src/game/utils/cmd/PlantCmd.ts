import { DeferredManager } from "../../managers/DeferredManager";
import { BaseEntity } from "../../models/core/BaseEntity";
import { PlantEntity } from "../../models/entities/PlantEntity";
import { PlantModel } from "../../models/PlantModel";
import type { Game } from "../../scenes/Game";


export namespace PlantCmd {
  /**
   * 通用植物创建方法 - 通过植物模型类型自动推导参数
   * 
   * **重要**：所有状态变化必须通过 Cmd 系统进行，以确保 post-update 的正确处理
   * 
   * @param model 植物逻辑模型
   * @param scene 当前场景
   * @param col 初始列
   * @param row 初始行
   * @param level 植物等级
   * 
   * @example
   * // ✅ 正确：通过 PlantLibrary 获取 Model 后创建
   * const model = PlantLibrary.GetModel(pid);
   * PlantCmd.Create(model, scene, col, row, level);
   */
  export function Create<TModel extends PlantModel>(
    model: TModel,
    scene: Game,
    col: number,
    row: number,
    level: number,
    callback?: (entity: PlantEntity) => void
  ) {
    DeferredManager.Instance.defer(() => {
      const entity = model.createEntity(scene, col, row, level);
      if (callback) callback(entity);
    });
  }

  /**
   * 设置植物生命值
   * 
   * **必须使用这个方法改变生命值**，不要直接修改 currentHealth
   * 原因：需要通过 DeferredManager 延迟处理以保证 post-update 的正确性
   * 
   * @param plant 植物实体
   * @param newHealth 新的生命值
   */
  export function SetHealth(plant: PlantEntity, newHealth: number) {
    DeferredManager.Instance.defer(() => {
      plant.currentHealth = newHealth;
    });
  }

  /**
   * 直接造成伤害
   */
  export function DealDamage(plant: PlantEntity, damage: number, dealer?: BaseEntity, source?: BaseEntity) {
    DeferredManager.Instance.defer(() => {
      plant.takeDamage(damage, dealer, source);
    });
  }

  /**
   * 设置植物睡眠状态
   * 
   * **必须使用这个方法改变睡眠状态**，不要直接调用 plant.setSleeping()
   * 原因：需要通过 DeferredManager 延迟处理以保证 post-update 的正确性
   * 
   * @param plant 植物实体
   * @param sleeping 是否进入睡眠状态
   */
  export function SetSleeping(plant: PlantEntity, sleeping: boolean) {
    DeferredManager.Instance.defer(() => {
      plant.setSleeping(sleeping);
    });
  }
}