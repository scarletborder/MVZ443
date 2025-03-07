import { Game } from "../scenes/Game";
import { IPlant } from "./IPlant";


export class IZombie extends Phaser.Physics.Arcade.Sprite {
    public static Group: Phaser.Physics.Arcade.Group;

    // 私有
    public health: number;
    public speed: number;
    public IsFrozen: boolean = false;
    public IsStop: boolean = false;
    private attackTimer?: Phaser.Time.TimerEvent; // 攻击定时器
    public attackingPlant: IPlant | null = null; // 当前攻击的植物
    private attackInterval: number = 1000; // 攻击间隔（1秒）

    public col: number;
    public row: number;

    static InitGroup(scene: Game) {
        this.Group = scene.physics.add.group({
            classType: IZombie,
            runChildUpdate: true
        });
    }

    constructor(scene: Game, col: number, row: number, texture: string) {
        const { x, y } = scene.positionCalc.getZombieBottomCenter(col, row);
        super(scene, x, y, texture, 0);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        let size = scene.positionCalc.getZombieDisplaySize();
        this.setDisplaySize(size.sizeX, size.sizeY);
        size = scene.positionCalc.getZombieBodySize();
        this.setBodySize(size.sizeX, size.sizeY);
        this.setOrigin(0.5, 1);


        IZombie.Group.add(this, true);
        this.health = 20; // 默认血量

        this.col = col;
        this.row = row;
    }

    // 设置生命值并监听
    public setHealth(value: number) {
        this.health = value;
        console.log(`Zombie health updated to: ${this.health}`);
        if (this.health <= 0) {
            this.destroyZombie();
        }
    }

    // 受到伤害
    public takeDamage(amount: number) {
        this.setHealth(this.health - amount);
    }

    // 开始攻击植物
    public startAttacking(plant: IPlant) {
        if (this.attackingPlant === plant) return; // 就是正在攻击碰到的植物,避免重复启动

        // TODO: 由别的植物导致的碰撞
        // 判断优先级,更换attackingPlant
        // 碰撞就会产生的函数
        // 如果在攻击过程中新增了碰撞(正在attacking的不为空),那么判断有了更加优先级的目标(南瓜)


        this.attackingPlant = plant;
        this.IsStop = true;
        this.setVelocityX(0);
        plant.attackingZombie.add(this);
        console.log('Zombie started attacking plant');

        // 启动攻击定时器
        this.attackTimer = this.scene.time.addEvent({
            delay: this.attackInterval,
            callback: () => this.hurtPlant(),
            loop: true,
        });
    }

    // 停止攻击
    public stopAttacking() {
        // 通知正在被攻击的植物
        this.attackingPlant?.attackingZombie.delete(this);

        if (this.attackTimer) {
            this.attackTimer.remove();
            this.attackTimer.destroy();
            this.attackTimer = undefined;
        }
        this.attackingPlant = null;
        this.IsStop = false;
        this.setVelocityX(-this.speed);
        console.log('Zombie stopped attacking');


    }

    // 伤害植物
    private hurtPlant() {
        if (this.attackingPlant && this.attackingPlant.active) {
            this.attackingPlant.takeDamage(5);
            if (!this.attackingPlant) return;
            console.log(`Zombie hurt plant, plant health: ${this.attackingPlant.health}`);
        }
    }

    // 销毁僵尸
    private destroyZombie() {
        if (this.attackTimer) {
            this.attackTimer.remove();
            this.attackTimer.destroy();
        }
        this.destroy();
        console.log('Zombie destroyed');
    }

    // 覆盖 destroy 方法，确保清理
    destroy(fromScene?: boolean) {
        this.attackTimer?.remove();
        this.attackTimer?.destroy();

        super.destroy(fromScene);
    }

    // // 每帧更新
    // update() {
    //     if (this.attackingPlant && !this.attackingPlant.active) {
    //         this.stopAttacking(); // 植物死亡时停止攻击
    //     }
    // }
}