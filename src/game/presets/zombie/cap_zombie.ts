import { MIRecord } from "../../models/IRecord";
import { IZombie } from "../../models/IZombie";
import { Game } from "../../scenes/Game";
import { EnhancedZombie } from "./zombie";

class CapZombie extends EnhancedZombie {
    capHealth: number = 375;
    currentHatState = 0;

    constructor(scene: Game, col: number, row: number, texture: string) {
        super(scene, col, row, texture);
        this.speed = 20 * scene.positionCalc.scaleFactor;
        this.capHealth = 375;

        const topX = this.x + this.offsetX;
        const topY = this.y - scene.positionCalc.GRID_SIZEY * 1.15 + this.offsetY;
        const cap = scene.physics.add.sprite(topX, topY, 'attach/cap');
        cap.setScale(scene.positionCalc.scaleFactor * 1.4);
        cap.setFrame(0);
        this.currentHatState = 0;
        cap.debugShowBody = false;
        scene.physics.add.existing(cap);
        console.log(cap.x, cap.y);
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
        console.log('cap dep', this.attachSprites.get('cap')?.depth);
        super.setDepth();
        return this;
    }
}


function NewZombie(scene: Game, x: number, y: number): IZombie {
    const zombie = new CapZombie(scene, x, y, 'zombie/zombie');
    zombie.setVelocityX(-zombie.speed);
    return zombie;
}

const CapZombieRecord: MIRecord = {
    mid: 2,
    name: 'CapZombie',
    NewFunction: NewZombie,
    texture: 'zombie/zombie',
}

export default CapZombieRecord;