import { SECKILL } from "../../../../public/constants";
import { Game } from "../../scenes/Game";
import GridClan from "../../utils/grid_clan";
import MonsterSpawner from "../../utils/spawner";
import { IPlant } from "../IPlant";

// monster
export class IMonster extends Phaser.Physics.Arcade.Sprite {
    // 与刷怪有关的属性
    public static Group: Phaser.Physics.Arcade.Group;
    protected static GridClan: GridClan;
    protected Spawner: MonsterSpawner;

    public game: Game;
    public waveID: number;
    public Rank: 'normal' | 'elite' | 'boss' = 'normal'; // 等级
    public couldCarryStarShards = false; // 是否可以携带星屑
    public carryStarShards: boolean = false; // 是否携带星之碎片

    public col: number;
    public row: number;
    scaleFactor: number = 1; // 缩放比例


    // 游戏性的属性
    public health: number;
    public maxHealth: number;
    public originalSpeed: number; // 默认情况速度,(静态值,不受buff影响)
    public speed: number; // 当前速度
    protected debuffs: { [key: string]: { remaining: number, timer: Phaser.Time.TimerEvent } } = {};  // 存储每个debuff的剩余时间和定时器


    public IsFrozen: boolean = false;
    public IsStop: boolean = false;

    public isFlying: boolean = false; // 是否在天上
    public isInVoid: boolean = false; // 是否是灵魂状态

    static InitGroup(scene: Game) {
        this.Group = scene.physics.add.group({
            classType: IMonster,
            runChildUpdate: true
        });
    }

    constructor(scene: Game, col: number, row: number, waveID: number = -10) {
        IMonster.GridClan = scene.gardener.GridClan;
        const texture = 'zombie/zombie';
        const { x, y } = scene.positionCalc.getZombieBottomCenter(col, row);
        super(scene, x, y, texture, 0);
        this.game = scene;
        this.col = col;
        this.row = row;
        this.waveID = waveID;
        this.Spawner = scene.monsterSpawner;
        this.scaleFactor = scene.positionCalc.scaleFactor;


        // 一些游戏属性的默认值
        this.isFlying = false;
        this.isInVoid = false;
        this.health = SECKILL;// 防止血量没有设置的时候暴毙.

        // 设置显示碰撞箱
        this.setVisible(false);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        let size = scene.positionCalc.getZombieBodySize();
        this.setBodySize(size.sizeX, size.sizeY * 0.9);
        size = scene.positionCalc.getZombieDisplaySize();
        this.setDisplaySize(size.sizeX, size.sizeY);
        this.setOffset(10 * scene.positionCalc.scaleFactor, + 20 * scene.positionCalc.scaleFactor);
        this.setOrigin(0.5, 1);

        // 进组
        IMonster.Group.add(this, true);
        this.Spawner.registerMonster(this);
    }

    // 交互
    startAttacking(plant: IPlant) { }

    // 游戏属性
    getIsFlying: () => boolean = () => this.isFlying;
    getIsInVoid: () => boolean = () => this.isInVoid;
    carryStar() {
        this.carryStarShards = true;
    }

    /**
     * 受到伤害
     * @param damage 子类在处理完逻辑后可以调用父类方法,传入真实受到的伤害(如已经考虑了减伤防御)
     * @param projectileType 
     */
    takeDamage(damage: number, projectileType?: "bullet" | "laser" | "explosion" | "trajectory") {
        const newHealth = this.health - damage;
        this.setHealth(newHealth);
    }

    /**
     * 设置生命值,子类必须重载这个函数,首先调用父类方法,接着判断血量做具体的逻辑
     * @param health 
     */
    setHealth(health: number) {
        if (health > this.maxHealth) this.health = this.maxHealth;

        this.health = health;
    }

    SetHealthFirsty(health: number) {
        this.health = health;
        this.maxHealth = health;
    }

    /**
     * 初始设置速度
     * @param speed 数值,无需考虑缩放比例
     */
    SetSpeedFirstly(speed: number) {
        const ratio = this.scaleFactor;
        this.originalSpeed = speed * ratio;
        this.speed = speed * ratio;
    }

    // catchDebuff函数，处理增加debuff
    public catchDebuff(debuff: 'slow' | 'frozen', duration: number) { }

    // 修改 removeDebuff，处理 frozen 移除后的恢复逻辑
    protected removeDebuff(debuff: 'slow' | 'frozen') { }

    /**
     * 根据debuff名字判断是否有debuff,如果有返回对应剩余时间(否则为0)
     * @param name debuff name
     * @returns 剩余时间(0表示没有debuff)
     */
    public hasDebuff(name: 'slow' | 'frozen'): number {
        try {
            if (this.debuffs[name]) {
                this.debuffs[name].remaining = Math.max(this.debuffs[name].timer.getRemaining(), 0);
            }
        } finally {
            return this.debuffs[name]?.remaining || 0;
        }
    }

    // 与刷怪有关的属性
    getWaveID: () => number = () => this.waveID;
    getRow: () => number = () => this.row;
    getX: () => number = () => this.x;
    getY: () => number = () => this.y;



    // 场景方法

    /**
     * 最根本的删除monster,用于 子类怪物 已经实现了自己的附件销毁逻辑,执行了死亡动画后的销毁
     * 
     * 将会取消注册怪物,并且从场景中移除
     * 
     * @param fromScene 是否从场景中移除
     */
    destroy(fromScene?: boolean): void {
        this.Spawner.registerDestroy(this);
        super.destroy(fromScene);
    }


}