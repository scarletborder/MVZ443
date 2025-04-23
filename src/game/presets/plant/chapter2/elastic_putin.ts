import { SECKILL } from "../../../../../public/constants";
import i18n from "../../../../utils/i18n";
import { IBullet } from "../../../models/IBullet";
import { INightPlant, IPlant } from "../../../models/IPlant";
import { IRecord } from "../../../models/IRecord";
import { Game } from "../../../scenes/Game";
import { Arrow } from "../../bullet/arrow";
import { HFireWork } from "../../bullet/firework";


// 允许反弹的类
const BounceableBullet = [Arrow, HFireWork];

function couldBounce(bullet: IBullet): boolean {
    // 只允许反弹的类
    for (const b of BounceableBullet) {
        if (bullet instanceof b) {
            return true;
        }
    }
    return false;
}


class ElasticPutin extends INightPlant {
    // 技能, 是否让穿过的bullet带上雷电爆炸属性
    isLightning: boolean = false;

    // 碰撞
    colliderBullet: Phaser.Physics.Arcade.Collider;
    colliderCallback: any;

    collideredBullets: Set<IBullet> = new Set();

    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, ElasticPutinRecord.texture, ElasticPutinRecord.pid, level);
        this.setFrame(0);
        this.setHealthFirstly(300);
        this.plant_height = 2;

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

        scene.frameTicker.delayedCall({
            delay: 5000,
            callback: () => {
                this.isLightning = false;
                // TODO 取消动画
            }
        })
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
        // 保存原先速度
        if (bullet.body && !wall.isSleeping && couldBounce(bullet)) {
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
        if (!bullet.body || !(couldBounce(bullet))) {
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
            bullet.catchEnhancement('fire');
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

const ElasticPutinRecord: IRecord = {
    pid: 15,
    name: '弹性布丁',
    cost: () => 100,
    cooldownTime: () => 8,
    NewFunction: NewElasticPutin,
    texture: 'plant/elastic_putin',
    description: i18n.S('elastic_putin_description'),
    NextLevelStuff: (level: number) => {
        return [{
            type: SECKILL,
            count: 1
        }];
    }

}


export default ElasticPutinRecord;