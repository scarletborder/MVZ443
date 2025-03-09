// 管理种植,铲除植物.以及使用星之碎片和激发植物的能力

import { IPlant } from "../models/IPlant";
import { Game } from "../scenes/Game";
import { PlantFactoryMap } from "./loader";
import { PositionCalc } from "./position";

export default class Gardener {
    scene: Game;
    planted: Map<string, Array<IPlant>> = new Map();
    positionCalc: PositionCalc;
    prevCol: number = -1;
    prevRow: number = -1;

    prevMovementTime = 0;
    UPDATE_INTERVAL = 50;

    // 卡槽中选中的植物(可为null)
    prePlantPid: number | null = null;

    // 高光植物和闪烁动画的管理
    private highlightSprite: Phaser.GameObjects.Sprite | null = null;
    private highlightTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Game, positionCalc: PositionCalc) {
        this.scene = scene;
        this.positionCalc = positionCalc;
    }

    // 选择卡片植物后
    // 设置预种植的植物 pid
    public setPrePlantPid(pid: number) {
        this.prePlantPid = pid;
        console.log(`Pre-plant PID set to: ${pid}`);
    }

    // 取消预种植
    public cancelPrePlant() {
        this.prePlantPid = null;
        this.stopHighlight();
        this.scene.broadCastCancelPrePlant();
        console.log('Pre-plant canceled');
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

    // 给定植物是否能够在(col,row)种植,考虑有没有南瓜罩
    public canPlant(col: number, row: number) {
        const key = `${col}-${row}`;
        if (this.planted.has(key)) {
            const list = this.planted.get(key);
            if (list && list.length > 0) {
                // TODO: 记录逻辑,但目前无论如何都返回false种植不了
                for (const plant of list) {
                    return false;
                }
            }
        }
        return true;
    }


    // 选择铲子后
    public selectShovel() { }

    // 鼠标移动事件dispatch
    public onMouseMoveEvent(pointer: Phaser.Input.Pointer) {
        // 如果没有选择植物，不做任何事情
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
        const plantRecord = PlantFactoryMap[this.prePlantPid];
        if (plantRecord) {
            this.startHighlight(col, row, plantRecord.texture);
        }
    }


    // 点击种植
    public onClickUp(pointer: Phaser.Input.Pointer) {
        if (this.prePlantPid === null) return;
        // 右键,取消种植
        if (pointer.rightButtonReleased()) {
            console.log('cancel pre-plant');
            this.cancelPrePlant();
            return;
        }

        console.log('prepare to plant', this.prePlantPid);
        let pid = this.prePlantPid;
        const { col, row } = this.positionCalc.getGridByPos(pointer.x, pointer.y);
        if (col >= 0 && row >= 0 && this.canPlant(col, row)) { // 假设已实现 isPlanted
            // TODO: 根据 pid 创建具体植物,这里注册函数在preload时候放到game的loader里面
            const plantRecord = PlantFactoryMap[pid];
            if (plantRecord) {
                plantRecord.NewFunction(this.scene, col, row); // 根据 pid 创建具体植物
            }
            this.cancelPrePlant(); // 种植后取消预种植
            this.scene.broadCastPlant(pid); // 通知种植卡片
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
        this.highlightSprite.setDepth(10);

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
} 