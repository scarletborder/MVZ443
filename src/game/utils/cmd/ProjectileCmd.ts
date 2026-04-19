import { ProjectileEntity } from "../../models/entities/ProjectileEntity";
import { ProjectileModel, BulletModel, BulletConfig, ExplosionModel, ExplosionConfig, LaserModel, LaserConfig } from "../../models/projectiles/ProjectileModels";
import type { Game } from "../../scenes/Game";
import { DeferredManager } from "../../managers/DeferredManager";

export namespace ProjectileCmd {
  // 类型辅助：从模型推导出配置类型
  type ConfigOf<TModel extends ProjectileModel<any, any>> = TModel extends ProjectileModel<infer TConfig, any> ? TConfig : never;

  /**
   * 通用投射物创建方法 - 通过模型类型自动推导配置类型
   * @param model 投射物模型实例
   * @param scene 当前场景
   * @param x 初始X坐标
   * @param row 初始行
   * @param cfg 配置参数
   * 
   * @example
   * Create(new BulletModel(), scene, 100, 2, bulletConfig)
   * Create(new ExplosionModel(), scene, 100, 2, explosionConfig)
   */
  export function Create<TModel extends ProjectileModel<any, any>>(
    model: TModel,
    scene: Game,
    x: number,
    row: number,
    cfg: ConfigOf<TModel>
  ) {
    DeferredManager.Instance.defer(() => {
      model.createEntity(scene, x, row, cfg);
    });
  }

  /**
   * 快捷创建子弹
   */
  export function CreateBullet(
    scene: Game,
    x: number,
    row: number,
    cfg: BulletConfig
  ) {
    const model = new BulletModel();
    Create(model, scene, x, row, cfg);
  }

  /**
   * 快捷创建爆炸
   */
  export function CreateExplosion(
    scene: Game,
    x: number,
    row: number,
    cfg: ExplosionConfig
  ) {
    const model = new ExplosionModel();
    Create(model, scene, x, row, cfg);
  }

  /**
   * 快捷创建激光
   */
  export function CreateLaser(
    scene: Game,
    x: number,
    row: number,
    cfg: LaserConfig
  ) {
    const model = new LaserModel();
    Create(model, scene, x, row, cfg);
  }
}