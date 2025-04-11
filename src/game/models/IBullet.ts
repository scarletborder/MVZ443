import { _Typedebuffs } from "../../constants/game";
import DepthManager from "../../utils/depth";
import IObstacle from "../presets/obstacle/IObstacle";
import { Game } from "../scenes/Game";
import { IPlant } from "./IPlant";
import { IMonster } from "./monster/IMonster";

export class IBullet extends Phaser.Physics.Arcade.Sprite {
    scene: Game;

    public ScreenWidth: number = 1024;
    public ScreenHeight: number = 768;

    // 为每个preset子弹设置group
    public static Group: Phaser.Physics.Arcade.Group;
    public targetCamp: 'plant' | 'zombie' = 'zombie'; // 默认打击僵尸

    // 私有属性
    public col: number;
    public row: number;

    public damage: number;
    public penetrate: number = 1; // 穿透次数
    public isFlying: boolean = false; // 是否在空中可以打击空中目标
    public hasPenetrated: Set<Phaser.Physics.Arcade.Sprite> = new Set(); // 已经穿透的目标
    public penetratedPunish: number = 0.5; // 穿透后伤害减少50%

    // buff
    public debuff: _Typedebuffs = null;
    public duration: number = 0;

    // 视觉
    private lastUpdateTime: number;
    public baseDepth: number;
    public visibleSprite: Phaser.GameObjects.Sprite | null = null;
    private renderX: number;
    private renderY: number;
    private lastRealX: number = 0;
    private lastRealY: number = 0;

    static InitGroup(scene: Game) {
        this.Group = scene.physics.add.group({
            classType: IBullet,
            runChildUpdate: true,
        });
    }

    constructor(scene: Game, col: number, row: number, texture: string,
        damage: number = 5, target: 'plant' | 'zombie' = 'zombie') {
        const { x, y } = scene.positionCalc.getBulletCenter(col, row);
        super(scene, x, y, texture);
        this.scene = scene;

        this.col = col;
        this.row = row;

        this.ScreenWidth = scene.sys.canvas.width;
        this.ScreenHeight = scene.sys.canvas.height;

        this.targetCamp = target;
        this.damage = damage;

        scene.physics.add.existing(this);
        scene.add.existing(this);

        let size = scene.positionCalc.getBulletBodySize();
        size = scene.positionCalc.getBulletDisplaySize();
        this.setDisplaySize(size.sizeX, size.sizeY);

        this.setOrigin(0.5, 0.5);
        IBullet.Group.add(this, true);

        this.baseDepth = DepthManager.getProjectileDepth('bullet', col);
        this.setDepth(this.baseDepth);

        this.updateRealPosition();
    }

    public addVisible(): void {
        if (!this.scene) return;
        // 隐藏原有物理 sprite，避免重复显示
        this.setVisible(false);

        // 创建非物理显示对象，使用与原 sprite 相同的纹理
        this.visibleSprite = this.scene.add.sprite(this.x, this.y, this.texture.key);
        if (this.visibleSprite) {
            // 同步显示尺寸
            this.visibleSprite.setDisplaySize(this.displayWidth, this.displayHeight);
            // 同步原点与深度
            this.visibleSprite.setOrigin(this.originX, this.originY);
            this.visibleSprite.setDepth(this.baseDepth);
            this.visibleSprite.setVisible(true);
        }
    }

    CollideObject(object: IMonster | IPlant | IObstacle) {
        const damage = this.damage;
        if (this.hasPenetrated.has(object) || this.penetrate <= 0) return; // 已经穿透过了

        if (object instanceof IMonster && this.targetCamp === 'zombie') {
            // 如果子弹的实际位置不再天上打不到isFlying
            if (object.getIsFlying() && !this.isFlying) return;

            // 如果isInVoid,并且该格子 没有 被照亮,也打不到
            // TODO: isInVoid的逻辑将在gardener中写,种植发光器械可以赋予周边的grid以 glow 状态
            if (object.isInVoid && (!false)) return;

            // 可以打
            // 穿透次数和销毁
            this.penetrate--;
            this.hasPenetrated.add(object);// 记录穿透过的对象
            if (this.penetrate <= 0) {
                this.destroy();
            }
            object.takeDamage(damage, "bullet", this);
            // 如果有debuff
            if (this.debuff) {
                object.catchDebuff(this.debuff, this.duration);
            }

            // 如果穿透后还存在穿透次数,则伤害降低
            if (this && this.penetrate && this.penetrate > 0) {
                this.damage = Math.floor(this.damage * this.penetratedPunish);
            }
        } else if (object instanceof IPlant && this.targetCamp === 'plant') {
            if (object.plant_height === 1) return;
            let targetPlant: IPlant = object;
            // 关于bullet击打植物,判断该格内的优先目标,shield>一般>carrier
            // 如果一grid内部的植物数量 > penetrate
            const col = targetPlant.col;
            const row = targetPlant.row;
            const key = `${col}-${row}`;
            // 既然有object,那么就肯定会有List
            // 如果有重要的植物,那么让他承担伤害
            const list = targetPlant.scene.gardener.planted.get(key);
            if (list) {
                this.hasPenetrated.add(targetPlant);// 记录穿透过的对象
                const clan = targetPlant.scene.gardener.GridClan;
                for (const plant of list) {
                    // 判断有没有更高级目标承担伤害
                    if (clan.MorePriorityPlant(targetPlant, plant)) targetPlant = plant;
                }
                targetPlant.takeDamage(damage);
            }

            // TODO: 僵尸子弹直接摧毁
            this.penetrate = 0;
            this.destroy();
        } else if (object instanceof IObstacle && this.targetCamp === 'zombie') {
            this.penetrate--;
            this.hasPenetrated.add(object);// 记录穿透过的对象

            if (this.penetrate <= 0) {
                this.destroy();
            }
            object.takeDamage(damage, "bullet");

            // 如果穿透后还存在穿透次数,则伤害降低
            if (this && this.penetrate && this.penetrate > 0) {
                this.damage = Math.floor(this.damage * this.penetratedPunish);
            }
        }
    }

    update(...args: any[]): void {
        if (!this.scene) return;

        const now = this.scene.time.now;
        const delta = now - (this.lastUpdateTime || now);
        this.lastUpdateTime = now;
        // 超越边界销毁
        if (this.x > this.ScreenWidth * 1.5 || this.x < -this.ScreenWidth * 0.5) {
            this.destroy();
        }

        // 更新视觉位置
        if (this.visibleSprite && !this.scene.isPaused) {
            const isUpdate = this.updateRealPosition(); // 是否通过real坐标进行更新
            if (!isUpdate && this.body) {
                // 进行视觉更新
                this.renderX = this.renderX + delta * this.body.velocity.x * 0.001;
                this.renderY = this.renderY + delta * this.body.velocity.y * 0.001;
                if (this.body.velocity.x < 0) {
                    // 物体向左移动，翻转
                    this.visibleSprite.setFlipX(true);
                } else if (this.body.velocity.x > 0) {
                    // 物体向右移动，不翻转
                    this.visibleSprite.setFlipX(false);
                }
            }
            this.visibleSprite.setPosition(this.renderX, this.renderY);
        }
    }

    updateRealPosition(): boolean {
        if (this.x !== this.lastRealX || this.y !== this.lastRealY) {
            this.renderX = this.x;
            this.renderY = this.y;
            this.lastRealX = this.x;
            this.lastRealY = this.y;
            return true;
        }
        return false;
    }

    destroy(fromScene?: boolean): void {
        if (this.visibleSprite) {
            this.visibleSprite.destroy();
            this.visibleSprite = null;
        }
        super.destroy(fromScene);
    }
}
