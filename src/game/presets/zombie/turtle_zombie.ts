import { MIRecord } from "../../models/IRecord";
import { IZombie } from "../../models/IZombie";
import { Game } from "../../scenes/Game";
import { EnhancedZombie } from "./zombie";

class TurtleZombie extends EnhancedZombie {
    capHealth: number = 375;
    scaleFactor: number;
    currentHatState = 0;

    constructor(scene: Game, col: number, row: number, texture: string, waveID: number) {
        super(scene, col, row, texture, waveID);
        this.waveID = waveID;
        this.scaleFactor = scene.positionCalc.scaleFactor;
        this.SetSpeedFirstly(20 * this.scaleFactor);
        this.capHealth = 370;

        const topX = this.x + this.offsetX;
        const topY = this.y - scene.positionCalc.GRID_SIZEY * 1.15 + this.offsetY;
        const cap = scene.physics.add.sprite(topX, topY, 'attach/turtle');
        cap.setScale(scene.positionCalc.scaleFactor * 1.4);
        cap.setFrame(0);
        this.currentHatState = 0;
        cap.debugShowBody = false;
        scene.physics.add.existing(cap);
        cap.setVisible(true);
        this.attachSprites.set('cap', cap);

        this.setDepth(); // 所有有附加元素的,要单独设置一次
    }

    public takeDamage(amount: number): void {
        if (this.capHealth > amount) {
            this.capHealth -= amount;
        } else {
            this.attachSprites.get('cap')?.setVisible(false);
            super.takeDamage(amount - this.capHealth);
            this.capHealth = 0;

            // 加速
            this.SetSpeedFirstly(30 * this.scaleFactor);
            if (!this.attackingPlant && !this.IsFrozen && this.hasDebuff('slow') === 0 ) {
                this.StartMove();
            }

        }

        if (this.capHealth > 0) {
            // 不同cap血量显示不同状态
            if (this.capHealth > 250) {
                this.currentHatState = 0;
            } else if (this.capHealth > 125) {
                this.currentHatState = 1;
            } else {
                this.currentHatState = 2;
            }
            this.attachSprites.get('cap')?.setFrame(this.currentHatState);
        }
    }

    setDepth() {
        // attach 不由本地管
        this.attachSprites.get('cap')?.setDepth(this.baseDepth + 13); // 帽子算比较高的
        super.setDepth();
        return this;
    }
}


function NewZombie(scene: Game, col: number, row: number, waveID: number): IZombie {
    const zombie = new TurtleZombie(scene, col, row, 'zombie/zombie', waveID);
    zombie.StartMove();
    return zombie;
}

const TurtleZombieRecord: MIRecord = {
    mid: 14,
    name: 'TurtleZombie',
    NewFunction: NewZombie,
    texture: 'zombie/zombie',
}

export default TurtleZombieRecord;