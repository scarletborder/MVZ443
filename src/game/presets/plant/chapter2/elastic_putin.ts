import { IBullet } from "../../../models/IBullet";
import { INightPlant, IPlant } from "../../../models/IPlant";
import { IRecord } from "../../../models/IRecord";
import { Game } from "../../../scenes/Game";
import BounceableBullet from "../../bullet/bounceable";


class ElasticPutin extends INightPlant {
    // 技能, 是否让穿过的bullet带上雷电爆炸属性
    isLightning: boolean = false;
    duration: number = 5000; // 技能持续时间

    // 碰撞
    colliderBullet: Phaser.Physics.Arcade.Collider;
    colliderCallback: any;

    collideredBullets: Set<IBullet> = new Set();

    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, ElasticPutinRecord.texture, ElasticPutinRecord.pid, level);
        this.setFrame(0);
        this.setHealthFirstly(300);
        this.plant_height = 2;
        if (level >= 7) {
            this.duration = 8000;
        }

        // 默认反弹回调
        this.colliderCallback = this.bounceBulletOffWall;

        // 设置反弹属性
        if (this.body) {
            this.setImmovable(true);
            scene.gardener.elastic_putin_nums[row]++;

            this.colliderBullet = scene.physics.add.collider(
                IBullet.Group,
                this,
                this.colliderCallback,
                // @ts-ignore
                this.processCollider,
                this
            );
        }
    }

    public onStarShards(): void {
        super.onStarShards();
        this.setSleeping(false); // 立即唤醒
        const scene = this.scene;
        if (!scene) return;
        // 为所有反弹的子弹添加雷电属性
        this.isLightning = true;
        // TODO: 设置动画

        if (this.level) {
            scene.frameTicker.delayedCall({
                delay: this.duration,
                callback: () => {
                    this.isLightning = false;
                    // TODO 取消动画
                }
            });
        }
    }

    destroy(fromScene?: boolean): void {
        this.scene.gardener.elastic_putin_nums[this.row]++;
        this.colliderBullet.destroy();
        // 清空set
        this.collideredBullets.clear();
        super.destroy(fromScene);
    }


    // 处理前
    processCollider(wall: IPlant, bullet: IBullet) {
        // 判断是否已经碰撞过
        if (this.collideredBullets.has(bullet)) {
            return false;
        }

        // 保存原先速度
        if (bullet.body && !wall.isSleeping && (bullet instanceof BounceableBullet)) {
            bullet._prevX = bullet.body.velocity.x;
            return true;
        }
        return false;
    }

    /**
     * 子弹撞到墙壁时被调用
     * @param {Phaser.Physics.Arcade.Sprite|Image} bullet  子弹
     * @param {Phaser.Physics.Arcade.Image} wall           撞到的墙壁
     */
    bounceBulletOffWall(wall: IPlant, bullet: IBullet) {
        // 只会反弹arrow或者arrow的变体(原型链)
        if (!bullet.body || !((bullet instanceof BounceableBullet))) {
            return;
        }

        const vx = bullet._prevX ?? 50;
        const f = 1;  // 取墙壁上的反弹系数，默认 1

        // 反弹目标是zombie的子弹
        if (bullet.targetCamp === 'zombie' && !this.collideredBullets.has(bullet)) {
            this.collideredBullets.add(bullet);
            bullet.destoryCallback.push(() => {
                this.collideredBullets.delete(bullet);
            });
            bullet.setVelocityX(-vx * f);
        }

        // 如果isLightning,对过来的arrow设置lightning
        if (this.isLightning) {
            bullet.catchEnhancement('lightning');
        }

        // 结束
        if (bullet._prevX) {
            delete bullet._prevX;
        }
    }
}


function NewElasticPutin(scene: Game, col: number, row: number, level: number): IPlant {
    const elasticPutin = new ElasticPutin(scene, col, row, level);
    return elasticPutin;
}

function cost(level?: number) {
    if ((level ?? 1) >= 3) return 75;
    return 100;
}

const ElasticPutinRecord: IRecord = {
    pid: 15,
    nameKey: 'name_elastic_putin',
    cost: cost,
    cooldownTime: () => 8,
    NewFunction: NewElasticPutin,
    texture: 'plant/elastic_putin',
    descriptionKey: 'elastic_putin_description',
}


export default ElasticPutinRecord;