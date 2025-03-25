import { sign } from "crypto";
import DepthManager from "../../../utils/depth";
import { Game } from "../../scenes/Game";
import MonsterSpawner from "../../utils/spawner";
import { IMonster } from "../../models/IRecord";


export type ObstacleParam = {
    health: number;
    onDestory: (scene: Game, x: number, y: number) => void;
};

export default class IObstacle extends Phaser.Physics.Arcade.Sprite implements IMonster {
    scene: Game;
    spawner: MonsterSpawner;
    public static Group: Phaser.Physics.Arcade.Group;

    // 属性
    health: number;
    row: number;
    col: number;
    waveID: number;
    onDestory: (scene: Game, x: number, y: number) => void;

    static InitGroup(scene: Game) {
        this.Group = scene.physics.add.group({
            classType: IObstacle,
            runChildUpdate: true
        });
    }

    getIsFlying(): boolean {
        return false;
    }

    getIsInVoid(): boolean {
        return false;
    }

    getWaveID(): number {
        return this.waveID;
    }

    getRow(): number {
        return this.row;
    }

    getX: () => number = () => this.x;

    constructor(scene: Game, x: number, y: number, waveID: number, texture: string, param: ObstacleParam) {
        super(scene, x, y, texture, 0);
        this.scene = scene;

        this.row = scene.positionCalc.getRowByY(y);
        this.col = scene.positionCalc.getColByX(x);
        this.waveID = waveID;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        if (!this.body) {
            throw new Error('IObstacle body is null');
        }
        this.health = param.health;
        this.onDestory = param.onDestory;

        IObstacle.Group.add(this, true);

        let size = scene.positionCalc.getPlantDisplaySize();
        this.setDisplaySize(size.sizeX, size.sizeY); // 改变显示大小 
        size = scene.positionCalc.getPlantBodySize();
        this.setBodySize(size.sizeX, size.sizeY);

        this.setOrigin(0.5, 1);

        this.body.immovable = true;
        const { row } = scene.positionCalc.getGridByPos(x, y);
        this.setDepth(DepthManager.getPlantBasicDepth(row));
        this.spawner = scene.monsterSpawner;
        this.spawner.registerMonster(this);
    }

    public takeDamage(amount: number, projectileType?: "bullet" | "laser" | "explosion" | "trajectory"): void {
        if (this.health > amount) {
            this.health -= amount;
            this.highlight();
        } else {
            this.onDestory(this.scene, this.x, this.y);
            this.destroy();
        }
    }

    destroy(fromScene?: boolean): void {
        this.spawner.registerDestroy(this);
        super.destroy(fromScene);
    }

    highlight() {
        // 计算绘制效果所需参数
        const depth = this.depth + 1;
        const centerX = this.x;
        // 因为僵尸的 body 原点为 (0.5, 1)，这里将中心点向上偏移一半的 GRID_SIZEY
        const centerY = this.y - this.scene.positionCalc.GRID_SIZEY / 2;

        const rangeWidth = this.scene.positionCalc.GRID_SIZEX;   // 横向范围
        const rangeHeight = this.scene.positionCalc.GRID_SIZEY;    // 纵向范围
        const textSize = this.scene.positionCalc.GRID_SIZEX / 5;    // 字体大小
        const textCount = 6;   // 文本数量

        for (let i = 0; i < textCount; i++) {
            // 在范围内随机生成文本的中心坐标
            let posX = Phaser.Math.Between(centerX - rangeWidth / 3, centerX + rangeWidth / 2);
            let posY = Phaser.Math.Between(centerY - rangeHeight / 2, centerY + rangeHeight / 2);

            // 根据 i 的奇偶性选择不同的颜色（这里使用十六进制字符串形式）
            const color = i % 2 === 0 ? "#C5B59B" : "#A79A8A";
            const ffont = i % 2 === 0 ? "X" : "+";

            // 创建文本对象，显示字符 "X"
            let textObj = this.scene.add.text(posX, posY, ffont, { fontSize: textSize + "px", color: color }).setDepth(depth);
            textObj.setOrigin(0.5, 0.5);
            this.scene.tweens.add({
                targets: textObj,
                alpha: 0.6,
                duration: 600,
                ease: 'Linear',
                onComplete: () => {
                    textObj.destroy();
                }
            });
        }
    }
}

export function NewObstacleByGrid(scene: Game, col: number, row: number, waveID: number, texture: string,
    param: ObstacleParam): IObstacle {
    const { x, y } = scene.positionCalc.getPlantBottomCenter(col, row);
    const obstacle = new IObstacle(scene, x, y, waveID, texture, param);
    return obstacle;
}

export function NewObstacleByPos(scene: Game, x: number, y: number, waveID: number, texture: string,
    param: ObstacleParam): IObstacle {
    const obstacle = new IObstacle(scene, x, y, waveID, texture, param);
    return obstacle;
}