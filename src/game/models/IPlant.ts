import DepthManager from "../../utils/depth";
import { Game } from "../scenes/Game";
import Gardener from "../utils/gardener";
import { IZombie } from "./IZombie";

export class IPlant extends Phaser.Physics.Arcade.Sprite {
    scene: Game;
    public static Group: Phaser.Physics.Arcade.Group;
    gardener: Gardener;

    public pid: number;
    public health: number;
    public maxhealth: number;
    public level: number;
    public Timer?: Phaser.Time.TimerEvent;
    public attackingZombie: Set<IZombie> = new Set<IZombie>();

    // 效果
    isSleeping = false; // 是否在睡觉
    sleepingText: Phaser.GameObjects.Text | null = null;
    sleepingTween: Phaser.Tweens.Tween | null = null;

    public col: number;
    public row: number;

    public baseDepth: number;

    static InitGroup(scene: Game) {
        this.Group = scene.physics.add.group({
            classType: IPlant,
            runChildUpdate: true
        });
    }


    constructor(scene: Game, col: number, row: number, texture: string, pid: number, level: number) {
        // TODO: texture逻辑还是要的,通过New某个植物的时候,传入对应的texture
        const { x, y } = scene.positionCalc.getPlantBottomCenter(col, row);
        super(scene, x, y, texture, 0);
        this.scene = scene;

        this.pid = pid;
        this.level = level;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        if (!this.body) {
            throw new Error('IPlant body is null');
        }

        IPlant.Group.add(this, true);  //TODO: 一定要把group带入,否则,真的会忘记添加到组里面
        let size = scene.positionCalc.getPlantDisplaySize();
        this.setDisplaySize(size.sizeX, size.sizeY); // 改变显示大小 
        size = scene.positionCalc.getPlantBodySize();
        this.setBodySize(size.sizeX, size.sizeY);
        // console.log(scene.positionCalc.scaleFactor)
        // this.setScale(scene.positionCalc.scaleFactor);

        this.setOrigin(0.5, 1);

        // console.log(this.body.width, this.body.height);
        this.body.immovable = true;

        this.col = col;
        this.row = row;
        this.gardener = scene.gardener;
        this.gardener.registerPlant(this);

        this.baseDepth = DepthManager.getPlantBasicDepth(row);
        this.setDepth(this.baseDepth);
    }

    public setHealthFirstly(value: number) {
        this.health = value;
        this.maxhealth = value;
    }

    public setHealth(value: number) {
        this.health = value;
        // console.log(`Plant health updated to: ${this.health}`);

        if (this.health <= 0) {
            this.destroyPlant();
        }
    }

    /**
     * 植物基类的受伤方法,这里只设置了血量更新,其他逻辑由子类实现
     * @param amount update offset number
     * @param zombie 造成伤害的来源,未来可能拓展如反叛等
     */
    public takeDamage(amount: number, zombie: IZombie | null = null) {
        this.setHealth(this.health - amount);
    }

    // 星之碎片
    public onStarShards() {
        const startX = this.x - this.gardener.positionCalc.GRID_SIZEX * 1 / 3;
        const startY = this.y - this.gardener.positionCalc.GRID_SIZEY / 2;
        const leng = 60 * this.gardener.positionCalc.scaleFactor;

        // 方向偏移量
        const directions = [
            { x: 1, y: 0 },  // 向右
            { x: -1, y: 0 }, // 向左
            { x: 0, y: 1 },  // 向下
            { x: 0, y: -1 }  // 向上
        ];

        // 创建 4 个 '*' 符号，并向四个方向发射
        directions.forEach(direction => {
            const star = this.scene.add.text(startX, startY, '* * *', {
                font: '32px Arial',
                color: '#ffffff'
            }).setDepth(this.baseDepth + 1);

            const endX = startX + direction.x * leng;
            const endY = startY + direction.y * leng;

            // 启动动画，使星号符号向四个方向发射
            this.scene.tweens.add({
                targets: star,
                x: endX,
                y: endY,
                alpha: { from: 1, to: 0.2 }, // 透明度变化
                duration: 1500,
                ease: 'Linear',
                onComplete: () => {
                    star.destroy(); // 动画完成后销毁星号对象
                }
            });
        });
    }

    // 游戏中effect
    setSleeping(value: boolean): void {
        this.isSleeping = value;
        if (value) {
            const startX = this.x;
            const startY = this.y - this.gardener.positionCalc.GRID_SIZEY / 2;
            const endX = this.x + 30 * this.gardener.positionCalc.scaleFactor;
            const endY = startY - 30 * this.gardener.positionCalc.scaleFactor;
            // 如果睡眠动画不存在则创建，若已经存在但被隐藏则显示
            if (!this.sleepingText) {
                this.sleepingText = this.scene.add.text(startX, startY, 'zzz', {
                    font: '16px Arial',
                    color: '#ffffff'
                });
            }
            this.sleepingText.setVisible(true);
            this.sleepingText.setDepth(this.baseDepth + 1);

            // 如果没有启动 tween，则创建一个 tween 实现斜向闪烁效果
            if (!this.sleepingTween) {
                this.sleepingTween = this.scene.tweens.add({
                    targets: this.sleepingText,
                    // 让 "zzz" 从当前位置向右上斜方向移动一定的偏移量
                    x: endX,
                    y: endY,
                    // 同时实现透明度变化，制造闪烁效果
                    alpha: { from: 1, to: 0 },
                    duration: 1000,
                    ease: 'Linear',
                    repeat: -1,
                    repeatDelay: 150,
                    onRepeat: () => {
                        this.sleepingText?.setPosition(startX, startY);
                        this.sleepingText?.setAlpha(1);
                    },
                    yoyo: true // 使透明度值反转，实现消失后再出现的效果
                });
            }
        } else {
            // 如果 value 为 false，隐藏动画并停止 tween
            if (this.sleepingText) {
                this.sleepingText.setVisible(false);
            }
            if (this.sleepingTween) {
                this.sleepingTween.stop();
                this.sleepingTween = null;
            }
        }
    }


    // 调用摧毁
    public destroyPlant() {
        // // 通知正在攻击的僵尸
        this.attackingZombie.forEach(zombie => {
            zombie.stopAttacking();
        });
        // 停止物理效果（已在 destroy 中自动处理）
        this.destroy(true); // 移除植物
        console.log('Plant destroyed');
    }

    // 底层摧毁
    destroy(fromScene?: boolean) {
        if (this.Timer) {
            this.Timer.remove();
            this.Timer.destroy();
        }
        this.gardener.registerDestroy(this);
        this.sleepingText?.destroy();
        this.sleepingTween?.stop();
        this.sleepingTween?.destroy();
        super.destroy(fromScene);
    }

}


// 夜间植物
export class INightPlant extends IPlant {
    constructor(scene: Game, col: number, row: number, texture: string, pid: number, level: number) {
        super(scene, col, row, texture, pid, level);
        if (scene.dayOrNight === true) {
            // 白天
            this.setSleeping(true);
        }
    }
}