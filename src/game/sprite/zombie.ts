import { Game } from "../scenes/Game";

export interface ZombieAnimProps {
    bodyKey: string, // 需要是两个,一个正常一个受伤
    headKey: string,
    armKey: string,
    legKey: string,
}

/**
 * 一般僵尸动画
 */
export default class IZombieAnim {
    scene: Game;
    scaneFactor: number;
    x: number;
    y: number;
    body: Phaser.GameObjects.Sprite;
    head: Phaser.GameObjects.Sprite;
    armLeft: Phaser.GameObjects.Sprite;
    armRight: Phaser.GameObjects.Sprite;
    legLeft: Phaser.GameObjects.Sprite;
    legRight: Phaser.GameObjects.Sprite;
    legLeftTween: Phaser.Tweens.Tween | null;
    legRightTween: Phaser.Tweens.Tween | null;
    armTween: Phaser.Tweens.Tween | null;

    // size
    // bodyWidth: number = 19;
    // bodyHeight: number = 35;
    headOffset: Array<number> = [-1, -46];
    leftArmOffset: Array<number> = [6, -24];
    rightArmOffset: Array<number> = [0, -26];
    leftLgetOffset: Array<number> = [2, -5];
    rightLegOffset: Array<number> = [-2, -10];

    setScale() {
        // 在创建完所有组件后进行全部组件的setScale
        console.log(this.scaneFactor)
        this.body.setScale(this.scaneFactor);
        this.head.setScale(this.scaneFactor);
        this.armLeft.setScale(this.scaneFactor);
        this.armRight.setScale(this.scaneFactor);
        this.legLeft.setScale(this.scaneFactor);
        this.legRight.setScale(this.scaneFactor);
    }

    constructor(scene: Game, x: number, y: number, props: ZombieAnimProps) {
        x = x;
        y = y - scene.positionCalc.gridOffsetY * 5 / 12;

        this.scaneFactor = scene.positionCalc.scaleFactor * 1.2;
        this.scene = scene;
        this.x = x;
        this.y = y;

        this.body = this.scene.add.sprite(x, y, props.bodyKey);
        this.body.setOrigin(0.5, 1);

        // TODO: 动画移动到全局
        this.scene.anims.create({
            key: 'bodyNormal',
            frames: [{ key: props.bodyKey, frame: 0 }],
            frameRate: 1,
            repeat: 0
        });
        this.scene.anims.create({
            key: 'bodyInjured',
            frames: [{ key: props.bodyKey, frame: 1 }],
            frameRate: 1,
            repeat: 0
        });
        this.body.anims.play('bodyNormal');

        this.head = this.scene.add.sprite(x + this.headOffset[0] * this.scaneFactor,
            y + this.headOffset[1] * this.scaneFactor, props.headKey);
        this.armLeft = this.scene.add.sprite(x + this.leftArmOffset[0] * this.scaneFactor,
            y + this.leftArmOffset[1] * this.scaneFactor, props.armKey);
        this.armRight = this.scene.add.sprite(x + this.rightArmOffset[0] * this.scaneFactor,
            y + this.rightArmOffset[1] * this.scaneFactor, props.armKey);
        this.legLeft = this.scene.add.sprite(x + this.leftLgetOffset[0] * this.scaneFactor,
            y + this.leftLgetOffset[1] * this.scaneFactor, props.legKey);
        this.legRight = this.scene.add.sprite(x + this.rightLegOffset[0] * this.scaneFactor,
            y + this.rightLegOffset[1] * this.scaneFactor, props.legKey);

        this.armLeft.setOrigin(1, 0.5);
        this.armRight.setOrigin(1, 0.5);
        this.legLeft.setOrigin(0.5, 0);
        this.legRight.setOrigin(0.5, 0);

        this.setScale();

        this.legLeftTween = null;
        this.armTween = null;
    }

    setDepth(base: number) {
        // 部件不在本地管
        this.head.setDepth(base + 9);
        console.log('head dep', this.head.depth);
        this.armLeft.setDepth(base + 8);
        this.armRight.setDepth(base + 6);
        this.body.setDepth(base + 7);
        this.legLeft.setDepth(base + 2);
        this.legRight.setDepth(base + 1);
    }

    startLegSwing() {
        if (!this.legLeftTween || !this.legLeftTween.isPlaying()) {
            this.legLeft.angle = -15;
            this.legLeftTween = this.scene.tweens.add({
                targets: this.legLeft,
                angle: { from: -15, to: 15 },
                duration: 500,
                yoyo: true,
                repeat: -1
            });
            this.legRight.angle = 15;
            this.legRightTween = this.scene.tweens.add({
                targets: this.legRight,
                angle: { from: 15, to: -15 },
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }
    }

    stopLegSwing() {
        if (this.legLeftTween && this.legLeftTween.isPlaying()) {
            this.legLeftTween?.stop();
            this.legRightTween?.stop();
            this.legLeft.angle = 0;
            this.legRight.angle = 0;
        }
    }

    startArmSwing() {
        if (!this.armTween || !this.armTween.isPlaying()) {
            this.armTween = this.scene.tweens.add({
                targets: [this.armLeft, this.armRight],
                angle: { from: +15, to: -15 },
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }
    }

    stopArmSwing() {
        if (this.armTween && this.armTween.isPlaying()) {
            this.armTween.stop();
            this.armLeft.angle = 0;
            this.armRight.angle = 0;
        }
    }

    switchBodyFrame(isInjured: boolean) {
        if (isInjured) {
            this.body.anims.play('bodyInjured');
        } else {
            this.body.anims.play('bodyNormal');
        }
    }

    updatePosition(x: number, y: number) {
        x = x;
        y = y - this.scene.positionCalc.gridOffsetY * 5 / 12;
        this.x = x;
        this.y = y;
        this.body.setPosition(x, y);
        this.head.setPosition(x + this.headOffset[0] * this.scaneFactor,
            y + this.headOffset[1] * this.scaneFactor);
        this.armLeft.setPosition(x + this.leftArmOffset[0] * this.scaneFactor,
            y + this.leftArmOffset[1] * this.scaneFactor);
        this.armRight.setPosition(x + this.rightArmOffset[0] * this.scaneFactor,
            y + this.rightArmOffset[1] * this.scaneFactor);
        this.legLeft.setPosition(x + this.leftLgetOffset[0] * this.scaneFactor,
            y + this.leftLgetOffset[1] * this.scaneFactor);
        this.legRight.setPosition(x + this.rightLegOffset[0] * this.scaneFactor,
            y + this.rightLegOffset[1] * this.scaneFactor);
    }

    setOrigin(x: number, y: number) {
        this.body.setOrigin(x, y);
        this.head.setOrigin(x, y);
        this.armLeft.setOrigin(x, 0); // Keep top pivot for arms
        this.armRight.setOrigin(x, 0);
        this.legLeft.setOrigin(x, 0); // Keep top pivot for legs
        this.legRight.setOrigin(x, 0);
    }

    destroy() {
        this.body.destroy();
        this.head.destroy();
        this.armLeft.destroy();
        this.armRight.destroy();
        this.legLeft.destroy();
        this.legRight.destroy();
        this.legLeftTween?.stop();
        this.armTween?.stop();
    }
} 