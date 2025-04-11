// 管理种植,铲除植物.以及使用星之碎片和激发植物的能力

// Ensure SHIELD_PLANT is typed correctly
import DepthManager from "../../utils/depth";
import { EventBus } from "../EventBus";
import { IPlant } from "../models/IPlant";
import { Game } from "../scenes/Game";
import GridClan from "./grid_clan";
import PlantFactoryMap from '../presets/plant';
import { PositionCalc } from "./position";

export default class Gardener {
    scene: Game;

    /**
     * key = `${col}-${row}`;
     */
    planted: Map<string, Array<IPlant>> = new Map();

    positionCalc: PositionCalc;
    prevCol: number = -1;
    prevRow: number = -1;

    prevMovementTime = 0;
    UPDATE_INTERVAL = 50;

    // 卡槽中选中的植物(可为null)
    prePlantPid: [number, number] | null = null; // [pid,level] | null
    // 种植复杂管理
    GridClan: GridClan;
    // 星之碎片
    useStarShards: boolean = false;
    starSprite: Phaser.GameObjects.Sprite;

    // 铁镐
    usePickaxe: boolean = false;
    pickaxeSprite: Phaser.GameObjects.Sprite;


    // 高光植物和闪烁动画的管理
    private highlightSprite: Phaser.GameObjects.Sprite | null = null;
    private highlightTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Game, positionCalc: PositionCalc) {
        this.usePickaxe = false;
        this.useStarShards = false;

        this.scene = scene;
        this.positionCalc = positionCalc;
        this.GridClan = new GridClan(this);
        // scene.add.image()
        this.pickaxeSprite = scene.add.sprite(0, 0, 'pickaxe');
        this.pickaxeSprite.setDisplaySize(52 * this.positionCalc.scaleFactor, 52 * this.positionCalc.scaleFactor)
            .setDepth(DepthManager.getInGameUIElementDepth(50));
        this.pickaxeSprite.setVisible(false);
        this.starSprite = scene.add.sprite(0, 0, 'starshards');
        this.starSprite.setDisplaySize(52 * this.positionCalc.scaleFactor, 52 * this.positionCalc.scaleFactor)
            .setDepth(DepthManager.getInGameUIElementDepth(50));
        this.starSprite.setVisible(false);

        // 监听事件
        EventBus.on('pickaxe-click', () => {
            // 取消其他的
            this.cancelStarShards();
            this.cancelPrePlant();
            if (this.usePickaxe) {
                this.cancelPickAxe();
            } else {
                this.pickAxe();
            }
        });

        EventBus.on('starshards-click', () => {
            this.cancelPickAxe();
            this.cancelPrePlant();
            if (this.useStarShards) {
                this.cancelStarShards();
            } else {
                this.setStarShards();
            }
        });
    }

    // 选择卡片植物后
    // 设置预种植的植物 pid
    public setPrePlantPid(pid: number, level: number) {
        // 如果设置了星之碎片,取消他
        if (this.useStarShards) {
            this.cancelStarShards();
        }
        // 如果设置了pickaxe,取消他
        if (this.usePickaxe) {
            this.cancelPickAxe();
        }

        this.prePlantPid = [pid, level];
    }

    // 取消预种植
    public cancelPrePlant() {
        this.prePlantPid = null;
        this.stopHighlight();
        this.scene.broadCastCancelPrePlant();
    }

    // 星之碎片选中
    public setStarShards() {
        this.stopHighlight();
        this.prePlantPid = null;
        this.usePickaxe = false;

        this.useStarShards = true;
        this.starSprite.setVisible(true);
        // 移动的光标位置
        try {
            const pointer = this.scene.input.activePointer;
            this.starSprite.setPosition(pointer.x, pointer.y);
        } catch {
            this.starSprite.setPosition(this.scene.scale.width * 1 / 3, this.scene.scale.height);
        }
    }

    // 取消星之碎片
    public cancelStarShards() {
        this.useStarShards = false;
        this.starSprite.setVisible(false);
    }

    // 星之碎片使用
    public launchStarShards(pid: number, col: number, row: number): boolean {
        console.log('使用')
        const key = `${col}-${row}`;
        if (this.planted.has(key)) {
            const list = this.planted.get(key);
            if (list) {
                const index = list.findIndex(plant => plant.pid === pid);
                if (index >= 0) {
                    // 找到对象
                    const plantObj = list[index];
                    plantObj.onStarShards();
                    // 通知使用星之碎片, 即使plant不存在也不会消耗星之碎片
                    return true;
                }
                if (list.length === 0) {
                    this.planted.delete(key);
                }
            }
        }
        return false;
    }


    // 拿起铁镐
    public pickAxe() {
        this.stopHighlight();
        this.prePlantPid = null;
        this.useStarShards = false;
        this.usePickaxe = true;
        this.pickaxeSprite.setVisible(true);
        // 移动的光标位置
        try {
            const pointer = this.scene.input.activePointer;
            this.pickaxeSprite.setPosition(pointer.x, pointer.y);
        } catch {
            this.pickaxeSprite.setPosition(this.scene.scale.width, 0);
        }

    }

    public cancelPickAxe() {
        this.usePickaxe = false;
        this.pickaxeSprite.setVisible(false);
    }

    // 植物注册种植
    public registerPlant(plant: IPlant) {
        const key = `${plant.col}-${plant.row}`;
        // 查找是否有这个list,否则创建一个新的list
        if (!this.planted.has(key)) {
            this.planted.set(key, [plant]);
        } else {
            this.planted.get(key)?.push(plant);
        }
    }

    // 植物注册销毁
    public registerDestroy(plant: IPlant) {
        const key = `${plant.col}-${plant.row}`;
        // 查找list
        if (this.planted.has(key)) {
            const list = this.planted.get(key);
            if (list) {
                const index = list.indexOf(plant);
                if (index >= 0) {
                    list.splice(index, 1);
                }
                if (list.length === 0) {
                    this.planted.delete(key);
                }
            }
        }
    }

    // pickaxe 移除
    public removePlant(pid: number, col: number, row: number) {
        const key = `${col}-${row}`;
        if (this.planted.has(key)) {
            const list = this.planted.get(key);
            if (list) {
                const index = list.findIndex(plant => plant.pid === pid);
                if (index >= 0) {
                    // 找到对象
                    const plantObj = list[index];
                    plantObj.destroyPlant();
                    list.splice(index, 1);
                }
                if (list.length === 0) {
                    this.planted.delete(key);
                }
            }
        }

    }

    // 给定植物是否能够在(col,row)种植,考虑有没有南瓜罩
    public canPlant(pid: number, col: number, row: number) {
        return this.GridClan.CanPlant(pid, col, row);
    }


    // 鼠标移动事件dispatch
    public onMouseMoveEvent(pointer: Phaser.Input.Pointer) {
        // 如果没有选择植物，不做任何事情
        // pickaxe 跟随
        if (this.usePickaxe) {
            const currentX = this.pickaxeSprite.x;
            const currentY = this.pickaxeSprite.y;
            const targetX = pointer.x;
            const targetY = pointer.y;
            const speed = 0.6;
            const newX = Phaser.Math.Linear(currentX, targetX, speed);
            const newY = Phaser.Math.Linear(currentY, targetY, speed);
            this.pickaxeSprite.setPosition(newX, newY);
            return;
        }

        if (this.useStarShards) {
            // star shards
            // 将星之碎片图标跟随
            const currentX = this.starSprite.x;
            const currentY = this.starSprite.y;
            const targetX = pointer.x;
            const targetY = pointer.y;
            const speed = 0.6;
            const newX = Phaser.Math.Linear(currentX, targetX, speed);
            const newY = Phaser.Math.Linear(currentY, targetY, speed);
            this.starSprite.setPosition(newX, newY);
            return;
        }

        if (this.prePlantPid === null) {
            return;
        }
        // 获得时间
        const time = this.scene.time.now;
        // 如果时间间隔小于更新间隔
        if (time - this.prevMovementTime < this.UPDATE_INTERVAL) {
            return;
        }
        // 更新时间
        this.prevMovementTime = time;

        const { col, row } = this.positionCalc.getGridByPos(pointer.x, pointer.y);
        if ((col === this.prevCol && row === this.prevRow) || col < 0 || row < 0) {
            return;
        }

        this.prevCol = col;
        this.prevRow = row;
        const plantRecord = PlantFactoryMap[this.prePlantPid[0]];
        if (plantRecord) {
            this.startHighlight(col, row, plantRecord.texture);
        }
    }


    // 得到鼠标指针指向的pid
    // 当 格子中包含多个植物的时候(护盾和主要植物)此函数根据pointer的y判断应该对哪个目标进行操作
    // 返回值为pid
    public gridWisePid(px: number, py: number): {
        pid: number,
        col: number,
        row: number
    } {
        return this.GridClan.gridWisePid(px, py);
    }

    // 点击事件
    // 种植,取消种植,使用星之碎片,取消星之碎片
    public onClickUp(pointer: Phaser.Input.Pointer) {
        if (this.prePlantPid === null && !this.useStarShards && !this.usePickaxe) return;

        // 右键,取消种植/取消星之碎片
        if (pointer.rightButtonReleased()) {
            if (this.useStarShards) {
                this.cancelStarShards();
            } else if (this.usePickaxe) {
                this.cancelPickAxe();
            } else {
                this.cancelPrePlant();
            }
            return;
        }

        // 星之碎片事件
        if (this.useStarShards) {
            const { pid, col, row } = this.gridWisePid(pointer.x, pointer.y);
            if (pid >= 0) {
                this.scene.sendQueue.sendStarShards(pid, col, row);
            }
            this.cancelStarShards();
            return;
        }

        // pickaxe事件
        if (this.usePickaxe) {
            // 铲除事件
            const { pid, row, col } = this.gridWisePid(pointer.x, pointer.y);
            if (pid >= 0) {
                this.scene.sendQueue.sendRemovePlant(pid, col, row);
            }
            this.cancelPickAxe();
            return;
        }

        // 种植事件
        if (this.prePlantPid !== null) {
            // 如果是暂停状态并且没有私密图纸,也不给种
            console.log('blueprint', this.scene.innerSettings.isBluePrint)
            if (!this.scene.innerSettings.isBluePrint && this.scene.isPaused) {
                return;
            }

            const { col, row } = this.positionCalc.getGridByPos(pointer.x, pointer.y);
            if (col >= 0 && row >= 0 && this.canPlant(this.prePlantPid[0], col, row)) {
                this.scene.sendQueue.sendCardPlant(this.prePlantPid[0], col, row, this.prePlantPid[1]);
            }
        }

    }

    // 开始高光
    private startHighlight(col: number, row: number, texture: string = 'plant/peashooter') {
        if (this.highlightSprite) {
            this.stopHighlight(); // 停止已经选中的高光
        }

        const { x, y } = this.positionCalc.getPlantBottomCenter(col, row);
        const size = this.positionCalc.getPlantDisplaySize();

        this.highlightSprite = this.scene.add.sprite(x, y, texture);
        this.highlightSprite.setDisplaySize(size.sizeX, size.sizeY);
        this.highlightSprite.setOrigin(0.5, 1);
        this.highlightSprite.setTint(0xffffff);
        this.highlightSprite.setAlpha(0.8);
        this.highlightSprite.setDepth(DepthManager.getInGameUIElementDepth(-5));

        this.highlightTween = this.scene.tweens.add({
            targets: this.highlightSprite,
            alpha: { from: 0.8, to: 0.2 },
            duration: 500,
            yoyo: true,
            repeat: -1,
        });
    }

    // 停止高光
    private stopHighlight() {
        if (this.highlightTween) {
            this.highlightTween.stop();
            this.highlightTween.remove();
            this.highlightTween = null;
        }
        if (this.highlightSprite) {
            this.highlightSprite.destroy();
            this.highlightSprite = null;
        }
        this.prevCol = -1;
        this.prevRow = -1;
    }


    // 给外部object使用的
    // 某一row中,画面的坐标X <= 给定x的位置有没有植物
    hasPlantBeforeX(row: number, x: number, maxDistance: number = 99999): boolean {
        // 首先判断 x 是第几 col
        const col = this.positionCalc.getGridByPos(x, this.positionCalc.gridOffsetY + 5).col;
        // 判断maxDistance到的位置
        let firstCol = this.positionCalc.getGridByPos(x - maxDistance, 0).col;
        if (firstCol < 0) { firstCol = 0; }

        for (let i = firstCol; i <= col; i++) {
            const key = `${i}-${row}`;
            if (this.planted.has(key)) {
                const list = this.planted.get(key);
                if (list && list.length > 0) return true;
            }

        }
        return false;
    }

} 