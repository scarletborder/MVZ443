import { Game } from "../scenes/Game";

export interface MutantAnimProps {
    Species: string, // 物种,如普通突变等

    bodyKey: string, // 可以有任何多个切片,但是需要填写bodyNum
    bodyNum: number, // 切片数量

    headKey: string,

    upperArmKey: string, // 绕轴转动
    lowerArmKey: string, // 随upperArmKey一起转动
    coverHandKey: string, // 随lowerArmKey一起转动

    upperLegKey: string, // 绕轴旋转
    lowerLegKey: string, // 随upperLegKey一起转动
}

export default class IMutantAnim {
    scene: Game;
    scaleFactor: number;
    x: number;
    y: number;

    isInAnim: boolean = false;
    offsetY: number = 0; // 视觉偏差,比如跳跃

    baseDepth: number;
    dirt: Phaser.GameObjects.Sprite | null = null;

    // 身体部位
    body: Phaser.GameObjects.Sprite;
    head: Phaser.GameObjects.Sprite;

    upperArmLeft: Phaser.GameObjects.Sprite;
    upperArmRight: Phaser.GameObjects.Sprite;
    lowerArmLeft: Phaser.GameObjects.Sprite;
    lowerArmRight: Phaser.GameObjects.Sprite;
    coverHandLeft: Phaser.GameObjects.Sprite;
    coverHandRight: Phaser.GameObjects.Sprite;

    upperLegLeft: Phaser.GameObjects.Sprite;
    upperLegRight: Phaser.GameObjects.Sprite;
    lowerLegLeft: Phaser.GameObjects.Sprite;
    lowerLegRight: Phaser.GameObjects.Sprite;

    legLeftTween: Phaser.Tweens.Tween | null;
    legRightTween: Phaser.Tweens.Tween | null;

    armTween: Phaser.Tweens.Tween | null;

    currentAngles: {
        upperArmLeft: number,
        upperArmRight: number,
        upperLegLeft: number,
        upperLegRight: number,
    };

    species: string;

    // size
    // bodyWidth: number = 19;
    // bodyHeight: number = 35;
    headOffset: Array<number> = [-1, -46];
    leftArmOffset: Array<number> = [6, -24];
    rightArmOffset: Array<number> = [0, -26];
    leftLgetOffset: Array<number> = [2, -5];
    rightLegOffset: Array<number> = [-2, -10];

    setScale() {
        // 在创建完所有组件后进行全部组件的 setScale
        console.log(this.scaleFactor);
        this.body.setScale(this.scaleFactor);
        this.head.setScale(this.scaleFactor);
        this.upperArmLeft.setScale(this.scaleFactor);
        this.upperArmRight.setScale(this.scaleFactor);
        // 新增 lowerArm 和 coverHand 的缩放
        this.lowerArmLeft.setScale(this.scaleFactor);
        this.lowerArmRight.setScale(this.scaleFactor);
        this.coverHandLeft.setScale(this.scaleFactor);
        this.coverHandRight.setScale(this.scaleFactor);
        this.upperLegLeft.setScale(this.scaleFactor);
        this.upperLegRight.setScale(this.scaleFactor);
    }

    constructor(scene: Game, x: number, y: number, props: MutantAnimProps) {
        x = x;
        y = y - scene.positionCalc.gridOffsetY * 5 / 12;

        this.species = props.Species;
        this.scaleFactor = scene.positionCalc.scaleFactor * 1.8;
        this.scene = scene;
        this.x = x;
        this.y = y;

        this.body = this.scene.add.sprite(x, y, props.bodyKey);
        this.body.setOrigin(0.5, 1);

        // TODO: 动画移动到全局
        for (let i = 0; i < props.bodyNum; i++) {
            this.scene.anims.create({
                key: `${this.species}body${i}`,
                frames: [{ key: props.bodyKey, frame: i }],
                frameRate: 1,
                repeat: 0
            });
        }
        this.body.anims.play(`${this.species}body0`); // 默认播放第0帧

        this.head = this.scene.add.sprite(
            x + this.headOffset[0] * this.scaleFactor,
            y + this.headOffset[1] * this.scaleFactor,
            props.headKey
        );

        // 创建 UpperArm（左右）
        this.upperArmLeft = this.scene.add.sprite(
            x + this.leftArmOffset[0] * this.scaleFactor,
            y + this.leftArmOffset[1] * this.scaleFactor,
            props.upperArmKey
        );
        this.upperArmRight = this.scene.add.sprite(
            x + this.rightArmOffset[0] * this.scaleFactor,
            y + this.rightArmOffset[1] * this.scaleFactor,
            props.upperArmKey
        );

        // 创建 UpperLeg（左右）
        this.upperLegLeft = this.scene.add.sprite(
            x + this.leftLgetOffset[0] * this.scaleFactor,
            y + this.leftLgetOffset[1] * this.scaleFactor,
            props.upperLegKey
        );
        this.upperLegRight = this.scene.add.sprite(
            x + this.rightLegOffset[0] * this.scaleFactor,
            y + this.rightLegOffset[1] * this.scaleFactor,
            props.upperLegKey
        );

        // 设置 upper 部件的原点（上臂以右侧为旋转点，腿部以中上部为旋转点）
        this.upperArmLeft.setOrigin(1, 0.5);
        this.upperArmRight.setOrigin(1, 0.5);
        this.upperLegLeft.setOrigin(0.5, 0);
        this.upperLegRight.setOrigin(0.5, 0);
        this.upperArmLeft.setRotation(-Math.PI / 3);
        this.upperArmRight.setRotation(-Math.PI / 3);

        // 新增：创建 lowerArm 和 coverHand（左右）
        // 下臂与护手的原点都设置为 (1, 0.5)
        this.lowerArmLeft = this.scene.add.sprite(0, 0, props.lowerArmKey);
        this.lowerArmRight = this.scene.add.sprite(0, 0, props.lowerArmKey);
        this.coverHandLeft = this.scene.add.sprite(0, 0, props.coverHandKey);
        this.coverHandRight = this.scene.add.sprite(0, 0, props.coverHandKey);

        this.lowerArmLeft.setOrigin(1, 0.5);
        this.lowerArmRight.setOrigin(1, 0.5);
        this.coverHandLeft.setOrigin(1, 0.5);
        this.coverHandRight.setOrigin(1, 0.5);

        // 将 lowerArm 紧贴在对应 upperArm 的末端
        // upperArm 的原点为 (1, 0.5)，因此它的末端（在局部坐标中为 (0,0.5)）的世界坐标可通过其 x 坐标减去 displayWidth 得到
        this.lowerArmLeft.x = this.upperArmLeft.x - this.upperArmLeft.displayWidth;
        this.lowerArmLeft.y = this.upperArmLeft.y;
        this.lowerArmRight.x = this.upperArmRight.x - this.upperArmRight.displayWidth;
        this.lowerArmRight.y = this.upperArmRight.y;

        // 如需要让 coverHand 紧贴在 lowerArm 的末端，则同样计算：
        this.coverHandLeft.x = this.lowerArmLeft.x - this.lowerArmLeft.displayWidth;
        this.coverHandLeft.y = this.lowerArmLeft.y;
        this.coverHandRight.x = this.lowerArmRight.x - this.lowerArmRight.displayWidth;
        this.coverHandRight.y = this.lowerArmRight.y;

        // 设置各部件缩放
        this.setScale();

        this.legLeftTween = null;
        this.armTween = null;

        // 初始角度
        this.currentAngles = {
            upperArmLeft: -60,
            upperArmRight: -60,
            upperLegLeft: 0,
            upperLegRight: 0,
        };
    }

    setDepth(base: number) {
        this.baseDepth = base;
        // 设置各部件深度
        this.upperArmLeft.setDepth(base + 9);
        this.upperArmRight.setDepth(base + 6);
        this.lowerArmLeft.setDepth(base + 5);
        this.lowerArmRight.setDepth(base + 4);
        this.coverHandLeft.setDepth(base + 3);
        this.coverHandRight.setDepth(base + 3);

        this.head.setDepth(base + 8);
        this.body.setDepth(base + 7);

        this.upperLegLeft.setDepth(base + 2);
        this.upperLegRight.setDepth(base + 1);
        this.lowerLegLeft.setDepth(base + 2);
        this.lowerLegRight.setDepth(base + 1);
    }


    /**
     * @param progress: [0,xxx]
     */
    switchBodyFrame(progress: number) {
        this.body.anims.play(`${this.species}body${progress}`);
    }

    updatePosition(x: number, y: number) {
        y = y - this.scene.positionCalc.GRID_SIZEY * 25 / 54 + this.offsetY;
        this.x = x;
        this.y = y;

        // 角度转换为弧度（仅针对上臂和腿部）
        const radianUpperArmLeft = this.currentAngles.upperArmLeft * (Math.PI / 180);
        const radianUpperArmRight = this.currentAngles.upperArmRight * (Math.PI / 180);
        const radianUpperLegLeft = this.currentAngles.upperLegLeft * (Math.PI / 180);
        const radianUpperLegRight = this.currentAngles.upperLegRight * (Math.PI / 180);

        // 更新身体和头部位置
        this.body.setPosition(x, y);
        this.head.setPosition(
            x + this.headOffset[0] * this.scaleFactor,
            y + this.headOffset[1] * this.scaleFactor
        );

        // 更新上臂位置，并根据上臂角度计算位置
        this.upperArmLeft.setPosition(
            x + this.leftArmOffset[0] * this.scaleFactor,
            y + this.leftArmOffset[1] * this.scaleFactor
        );
        const upperArmLengthLeft = this.upperArmLeft.displayHeight;
        this.upperArmLeft.x = x + this.leftArmOffset[0] * this.scaleFactor + upperArmLengthLeft * Math.cos(radianUpperArmLeft);
        this.upperArmLeft.y = y + this.leftArmOffset[1] * this.scaleFactor + upperArmLengthLeft * Math.sin(radianUpperArmLeft);

        this.upperArmRight.setPosition(
            x + this.rightArmOffset[0] * this.scaleFactor,
            y + this.rightArmOffset[1] * this.scaleFactor
        );
        const upperArmLengthRight = this.upperArmRight.displayHeight;
        this.upperArmRight.x = x + this.rightArmOffset[0] * this.scaleFactor + upperArmLengthRight * Math.cos(radianUpperArmRight);
        this.upperArmRight.y = y + this.rightArmOffset[1] * this.scaleFactor + upperArmLengthRight * Math.sin(radianUpperArmRight);

        // 更新下臂和护手的位置：它们依赖于上臂的角度
        // 假设下臂长度和护手偏移均固定，可以通过上臂的末端计算得到
        const lowerArmLengthLeft = this.lowerArmLeft.displayHeight;
        this.lowerArmLeft.x = this.upperArmLeft.x + lowerArmLengthLeft * Math.cos(radianUpperArmLeft);
        this.lowerArmLeft.y = this.upperArmLeft.y + lowerArmLengthLeft * Math.sin(radianUpperArmLeft);
        // 假设护手与下臂末端有一个固定偏移（这里使用 lowerArmLeft.displayWidth 作为示例）
        this.coverHandLeft.x = this.lowerArmLeft.x + this.lowerArmLeft.displayWidth * Math.cos(radianUpperArmLeft);
        this.coverHandLeft.y = this.lowerArmLeft.y + this.lowerArmLeft.displayWidth * Math.sin(radianUpperArmLeft);

        const lowerArmLengthRight = this.lowerArmRight.displayHeight;
        this.lowerArmRight.x = this.upperArmRight.x + lowerArmLengthRight * Math.cos(radianUpperArmRight);
        this.lowerArmRight.y = this.upperArmRight.y + lowerArmLengthRight * Math.sin(radianUpperArmRight);
        this.coverHandRight.x = this.lowerArmRight.x + this.lowerArmRight.displayWidth * Math.cos(radianUpperArmRight);
        this.coverHandRight.y = this.lowerArmRight.y + this.lowerArmRight.displayWidth * Math.sin(radianUpperArmRight);

        // 更新腿部位置
        this.upperLegLeft.setPosition(
            x + this.leftLgetOffset[0] * this.scaleFactor,
            y + this.leftLgetOffset[1] * this.scaleFactor
        );
        const upperLegLengthLeft = this.upperLegLeft.displayHeight;
        this.upperLegLeft.x = x + this.leftLgetOffset[0] * this.scaleFactor + upperLegLengthLeft * Math.cos(radianUpperLegLeft);
        this.upperLegLeft.y = y + this.leftLgetOffset[1] * this.scaleFactor + upperLegLengthLeft * Math.sin(radianUpperLegLeft);

        this.upperLegRight.setPosition(
            x + this.rightLegOffset[0] * this.scaleFactor,
            y + this.rightLegOffset[1] * this.scaleFactor
        );
        const upperLegLengthRight = this.upperLegRight.displayHeight;
        this.upperLegRight.x = x + this.rightLegOffset[0] * this.scaleFactor + upperLegLengthRight * Math.cos(radianUpperLegRight);
        this.upperLegRight.y = y + this.rightLegOffset[1] * this.scaleFactor + upperLegLengthRight * Math.sin(radianUpperLegRight);

        // 小腿依然可以简单跟随上腿
        const lowerLegLengthLeft = this.lowerLegLeft.displayHeight;
        this.lowerLegLeft.x = this.upperLegLeft.x + lowerLegLengthLeft * Math.cos(radianUpperLegLeft);
        this.lowerLegLeft.y = this.upperLegLeft.y + lowerLegLengthLeft * Math.sin(radianUpperLegLeft);

        const lowerLegLengthRight = this.lowerLegRight.displayHeight;
        this.lowerLegRight.x = this.upperLegRight.x + lowerLegLengthRight * Math.cos(radianUpperLegRight);
        this.lowerLegRight.y = this.upperLegRight.y + lowerLegLengthRight * Math.sin(radianUpperLegRight);

        // 最后同步更新缩放
        this.setScale();
    }

    /**
     * 启动腿部摇摆动画（上臂角度独立记录）
     */
    startLegSwing() {
        if (!this.legLeftTween || !this.legLeftTween.isPlaying()) {
            // 设置初始角度
            this.currentAngles.upperLegLeft = -15;
            this.currentAngles.upperLegRight = 15;
            this.upperLegLeft.angle = -15;
            this.upperLegRight.angle = 15;

            this.legLeftTween = this.scene.tweens.add({
                targets: this.upperLegLeft,
                angle: { from: -15, to: 15 },
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                onUpdate: () => {
                    this.currentAngles.upperLegLeft = this.upperLegLeft.angle;
                }
            });
            this.legRightTween = this.scene.tweens.add({
                targets: this.upperLegRight,
                angle: { from: 15, to: -15 },
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                onUpdate: () => {
                    this.currentAngles.upperLegRight = this.upperLegRight.angle;
                }
            });
        }
    }

    /**
     * 停止腿部摇摆动画，并将上腿角度重置为 0
     */
    stopLegSwing() {
        if (this.legLeftTween && this.legLeftTween.isPlaying()) {
            this.legLeftTween.stop();
            this.legRightTween?.stop();
            this.legLeftTween = null;
            this.legRightTween = null;
            this.upperLegLeft.angle = 0;
            this.upperLegRight.angle = 0;
            this.currentAngles.upperLegLeft = 0;
            this.currentAngles.upperLegRight = 0;
        }
    }

    /**
     * 启动手臂摇摆动画：
     * 只对上臂做 Tween，下臂和护手依赖上臂的角度计算位置
     */
    startArmSwing() {
        // 平滑过渡到起始角度 95°
        this.scene.tweens.add({
            targets: [this.upperArmLeft, this.upperArmRight],
            angle: 95,
            duration: 500,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                this.currentAngles.upperArmLeft = this.upperArmLeft.angle;
                this.currentAngles.upperArmRight = this.upperArmRight.angle;
            },
            onComplete: () => {
                // 开启循环：在 95° 与 75° 之间摇摆
                this.armTween = this.scene.tweens.add({
                    targets: [this.upperArmLeft, this.upperArmRight],
                    angle: { from: 95, to: 75 },
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    onUpdate: () => {
                        this.currentAngles.upperArmLeft = this.upperArmLeft.angle;
                        this.currentAngles.upperArmRight = this.upperArmRight.angle;
                    }
                });
            }
        });
    }

    /**
     * 停止手臂摇摆动画，先停止循环 Tween，再平滑过渡到静止角度 -60°
     */
    stopArmSwing() {
        if (this.armTween && this.armTween.isPlaying()) {
            this.armTween.stop();
            this.armTween = null;
        }
        this.scene.tweens.add({
            targets: [this.upperArmLeft, this.upperArmRight],
            angle: -60,
            duration: 600,
            ease: 'Sine.easeOut',
            onUpdate: () => {
                this.currentAngles.upperArmLeft = this.upperArmLeft.angle;
                this.currentAngles.upperArmRight = this.upperArmRight.angle;
            }
        });
    }

    setOrigin(x: number, y: number) {
        this.body.setOrigin(x, y);
        this.head.setOrigin(x, y);
        this.upperArmLeft.setOrigin(x, 0); // Keep top pivot for arms
        this.upperArmRight.setOrigin(x, 0);
        this.upperLegLeft.setOrigin(x, 0); // Keep top pivot for legs
        this.upperLegRight.setOrigin(x, 0);
    }

    destroy() {
        // 先停止所有 tween
        this.scene.tweens.killTweensOf([
            this.body,
            this.head,
            this.upperArmLeft,
            this.upperArmRight,
            this.upperLegLeft,
            this.upperLegRight,
            this.lowerArmLeft,
            this.lowerArmRight,
            this.coverHandLeft,
            this.coverHandRight
        ]);

        // 销毁所有组件
        this.coverHandLeft.destroy();
        this.coverHandRight.destroy();
        this.lowerArmLeft.destroy();
        this.lowerArmRight.destroy();
        this.body.destroy();
        this.head.destroy();
        this.upperArmLeft.destroy();
        this.upperArmRight.destroy();
        this.lowerLegLeft.destroy();
        this.lowerLegRight.destroy();
        this.upperLegLeft.destroy();
        this.upperLegRight.destroy();

        // 停止并清理 leg 和 arm 的 tween
        this.legLeftTween?.stop();
        this.legRightTween?.stop();
        this.armTween?.stop();

        // 动画特效相关（例如：this.stopSlowEffect();）
    }

    highlight() {
        // 计算绘制效果所需参数
        const depth = this.body.depth + 1;  // 根据实际情况调整深度
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


export class EnhancedGolemAnim extends IMutantAnim { }