import { Game } from "../scenes/Game";

export interface MutantAnimProps {
    Species: string, // 物种,如普通突变等

    bodyKey: string, // 可以有任何多个切片,但是需要填写bodyNum
    bodyNum: number, // 切片数量

    headKey: string,

    upperArmKey: string, // 绕轴转动
    lowerArmKey: string, // 随upperArmKey一起转动

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

    upperLegLeft: Phaser.GameObjects.Sprite;
    upperLegRight: Phaser.GameObjects.Sprite;
    lowerLegLeft: Phaser.GameObjects.Sprite;
    lowerLegRight: Phaser.GameObjects.Sprite;

    legTweens: Phaser.Tweens.Tween[] = [];
    armTweens: Phaser.Tweens.Tween[] = [];

    currentAngles: {
        upperArmLeft: number,
        upperArmRight: number,
        upperLegLeft: number,
        upperLegRight: number,
    };

    //attach
    handObject: Phaser.GameObjects.Sprite | null = null;
    backObject: Phaser.GameObjects.Sprite | null = null;

    species: string;

    // status
    isFrozen = false;

    // size
    // bodyWidth: number = 19;
    // bodyHeight: number = 35;
    wholeOffset: Array<number> = [0, -60];
    headOffset: Array<number> = [8, -56];
    leftArmOffset: Array<number> = [13, -50];
    rightArmOffset: Array<number> = [-10, -46];
    leftLgetOffset: Array<number> = [10, -2];
    rightLegOffset: Array<number> = [-10, -2];
    slowEffectTimer: Phaser.Time.TimerEvent | null = null;

    setScale() {
        // 在创建完所有组件后进行全部组件的 setScale
        this.body.setScale(this.scaleFactor * 1);
        this.head.setScale(this.scaleFactor * 1);
        this.upperArmLeft.setScale(this.scaleFactor * 1);
        this.upperArmRight.setScale(this.scaleFactor * 1);
        // 新增 lowerArm 和 coverHand 的缩放
        this.lowerArmLeft.setScale(this.scaleFactor * 1);
        this.lowerArmRight.setScale(this.scaleFactor * 1);
        this.upperLegLeft.setScale(this.scaleFactor * 1);
        this.upperLegRight.setScale(this.scaleFactor * 1);
    }

    setHandObject(key: string) {
        if (!this.scene) return;
        const scene = this.scene;
        if (this.handObject) {
            // 已经有,那么摧毁原先
            this.handObject.destroy();
            this.handObject = null;
        }
        // 无论如何都增加新的
        const armLength = this.lowerArmLeft.displayWidth;
        const rad = this.currentAngles.upperArmLeft * Math.PI / 180;
        const originX = this.lowerArmLeft.x + armLength
            * Math.cos(rad);
        const originY = this.lowerArmLeft.y + armLength
            * Math.sin(rad);

        this.handObject = this.scene.add.sprite(originX, originY, key);
        this.handObject.setOrigin(1, 0.5);

        scene.physics.add.existing(this.handObject);
        this.handObject.setVisible(true);

        this.handObject.setDepth(this.baseDepth + 10);
    }

    setBackObject(key: string) { }

    constructor(scene: Game, x: number, y: number, props: MutantAnimProps) {
        x = x + this.wholeOffset[0] * scene.positionCalc.scaleFactor;
        y = y + this.wholeOffset[1] * scene.positionCalc.scaleFactor;

        this.species = props.Species;
        this.scaleFactor = scene.positionCalc.scaleFactor;
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
        this.head.setOrigin(0.7, 1)

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
        this.upperArmLeft.setOrigin(0.5, 0);
        this.upperArmRight.setOrigin(0.5, 0);
        this.upperLegLeft.setOrigin(0.5, 0);
        this.upperLegRight.setOrigin(0.5, 0);

        // 新增：创建 lowerLeg（左右）
        this.lowerLegLeft = this.scene.add.sprite(0, 0, props.lowerLegKey);
        this.lowerLegRight = this.scene.add.sprite(0, 0, props.lowerLegKey);
        this.lowerLegLeft.setOrigin(0.5, 0);
        this.lowerLegRight.setOrigin(0.5, 0);

        // 新增：创建 lowerArm 和 coverHand（左右）
        // 下臂与护手的原点都设置为 (1, 0.5)
        this.lowerArmLeft = this.scene.add.sprite(0, 0, props.lowerArmKey);
        this.lowerArmRight = this.scene.add.sprite(0, 0, props.lowerArmKey);

        this.lowerArmLeft.setOrigin(0.5, 0.2);
        this.lowerArmRight.setOrigin(0.5, 0.2);

        // 将 lowerArm 紧贴在对应 upperArm 的末端
        // upperArm 的原点为 (1, 0.5)，因此它的末端（在局部坐标中为 (0,0.5)）的世界坐标可通过其 x 坐标减去 displayWidth 得到
        this.lowerArmLeft.x = this.upperArmLeft.x - this.upperArmLeft.displayWidth;
        this.lowerArmLeft.y = this.upperArmLeft.y;
        this.lowerArmRight.x = this.upperArmRight.x - this.upperArmRight.displayWidth;
        this.lowerArmRight.y = this.upperArmRight.y;

        // 设置各部件缩放
        this.setScale();

        this.legTweens = [];
        this.armTweens = [];

        // 初始角度
        this.currentAngles = {
            upperArmLeft: 0,
            upperArmRight: 0,
            upperLegLeft: 0,
            upperLegRight: 0,
        };

        this.upperArmLeft.setRotation(this.currentAngles.upperArmLeft * Math.PI / 180);
        this.upperArmRight.setRotation(this.currentAngles.upperArmRight * Math.PI / 180);
    }

    setDepth(base: number) {
        this.baseDepth = base;
        // 设置各部件深度
        this.upperArmLeft.setDepth(base + 9);
        this.upperArmRight.setDepth(base - 1);
        this.lowerArmLeft.setDepth(base + 11);
        this.lowerArmRight.setDepth(base + 0);

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
        x = x + this.wholeOffset[0] * this.scaleFactor;
        y = y + this.wholeOffset[1] * this.scaleFactor + this.offsetY;
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
        const upperArmLengthLeft = this.upperArmLeft.displayHeight - 10 * this.scaleFactor;
        this.upperArmLeft.x = x + this.leftArmOffset[0] * this.scaleFactor;
        this.upperArmLeft.y = y + this.leftArmOffset[1] * this.scaleFactor;

        this.upperArmRight.setPosition(
            x + this.rightArmOffset[0] * this.scaleFactor,
            y + this.rightArmOffset[1] * this.scaleFactor
        );
        const upperArmLengthRight = this.upperArmRight.displayHeight - 10 * this.scaleFactor;
        this.upperArmRight.x = x + this.rightArmOffset[0] * this.scaleFactor;
        this.upperArmRight.y = y + this.rightArmOffset[1] * this.scaleFactor;

        // 更新下臂和护手的位置：它们依赖于上臂的角度
        // 假设下臂长度和护手偏移均固定，可以通过上臂的末端计算得到
        this.lowerArmLeft.x = this.upperArmLeft.x - upperArmLengthLeft * Math.sin(radianUpperArmLeft);
        this.lowerArmLeft.y = this.upperArmLeft.y + upperArmLengthLeft * Math.cos(radianUpperArmLeft);
        this.lowerArmLeft.setRotation(radianUpperArmLeft + 2 / 3);

        this.lowerArmRight.x = this.upperArmRight.x - upperArmLengthRight * Math.sin(radianUpperArmRight);
        this.lowerArmRight.y = this.upperArmRight.y + upperArmLengthRight * Math.cos(radianUpperArmRight);
        this.lowerArmRight.setRotation(radianUpperArmRight + 2 / 3);

        // 更新腿部位置
        this.upperLegLeft.setPosition(
            x + this.leftLgetOffset[0] * this.scaleFactor,
            y + this.leftLgetOffset[1] * this.scaleFactor
        );
        const upperLegLengthLeft = this.upperLegLeft.displayHeight - 10 * this.scaleFactor;
        this.upperLegLeft.x = x + this.leftLgetOffset[0] * this.scaleFactor;
        this.upperLegLeft.y = y + this.leftLgetOffset[1] * this.scaleFactor;

        this.upperLegRight.setPosition(
            x + this.rightLegOffset[0] * this.scaleFactor,
            y + this.rightLegOffset[1] * this.scaleFactor
        );
        const upperLegLengthRight = this.upperLegRight.displayHeight - 10 * this.scaleFactor;
        this.upperLegRight.x = x + this.rightLegOffset[0] * this.scaleFactor;
        this.upperLegRight.y = y + this.rightLegOffset[1] * this.scaleFactor;

        // 小腿依然可以简单跟随上腿
        this.lowerLegLeft.x = this.upperLegLeft.x + upperLegLengthLeft * Math.sin(-radianUpperLegLeft);
        this.lowerLegLeft.y = this.upperLegLeft.y + upperLegLengthLeft * Math.cos(-radianUpperLegLeft);
        this.lowerLegLeft.setRotation(radianUpperLegLeft - 1 / 2);

        this.lowerLegRight.x = this.upperLegRight.x + upperLegLengthRight * Math.sin(-radianUpperLegRight);
        this.lowerLegRight.y = this.upperLegRight.y + upperLegLengthRight * Math.cos(-radianUpperLegRight);
        this.lowerLegRight.setRotation(radianUpperLegRight - 1 / 2);

        // 更新attachment
        if (this.handObject) {
            const armLength = this.lowerArmLeft.displayWidth;
            const offsetRad = (this.currentAngles.upperArmLeft - 60) * Math.PI / 180;
            const Rad = (this.currentAngles.upperArmLeft + 20) * Math.PI / 180;
            const originX = this.lowerArmLeft.x + (armLength - 30 * this.scaleFactor)
                * Math.cos(offsetRad);
            const originY = this.lowerArmLeft.y + (armLength - 40 * this.scaleFactor)
                * Math.sin(offsetRad);
            this.handObject.x = originX;
            this.handObject.y = originY;
            this.handObject.setRotation(Rad);
        }

        // 最后同步更新缩放
        this.setScale();
    }

    /**
     * 启动腿部摇摆动画：
     * 先从当前角度平滑过渡到初始角度（左腿 -15°，右腿 15°），然后开始循环摆动
     */
    startLegSwing() {
        // 清空之前的所有腿部动画
        this.stopLegSwing();

        // 如果冻结状态，不执行动画
        if (this.isFrozen) return;

        // 第一步：左腿平滑过渡到初始角度 -15°
        const leftLegTween1 = this.scene.tweens.add({
            targets: this.upperLegLeft,
            angle: -15,
            duration: 300,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                this.currentAngles.upperLegLeft = this.upperLegLeft.angle;
            },
            onComplete: () => {
                // 确保角度同步
                this.currentAngles.upperLegLeft = -15;
                // 开启循环：在 0° 与 30° 之间摇摆
                const leftLegTween2 = this.scene.tweens.add({
                    targets: this.upperLegLeft,
                    angle: { from: 0, to: 30 },
                    duration: 550,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    onUpdate: () => {
                        this.currentAngles.upperLegLeft = this.upperLegLeft.angle;
                    }
                });
                this.legTweens.push(leftLegTween2);
            }
        });
        this.legTweens.push(leftLegTween1);

        // 第一步：右腿平滑过渡到初始角度 15°
        const rightLegTween1 = this.scene.tweens.add({
            targets: this.upperLegRight,
            angle: 15,
            duration: 300,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                this.currentAngles.upperLegRight = this.upperLegRight.angle;
            },
            onComplete: () => {
                // 确保角度同步
                this.currentAngles.upperLegRight = 15;
                // 开启循环：在 30° 与 0° 之间摇摆
                const rightLegTween2 = this.scene.tweens.add({
                    targets: this.upperLegRight,
                    angle: { from: 30, to: 0 },
                    duration: 550,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    onUpdate: () => {
                        this.currentAngles.upperLegRight = this.upperLegRight.angle;
                    }
                });
                this.legTweens.push(rightLegTween2);
            }
        });
        this.legTweens.push(rightLegTween1);
    }


    /**
     * 停止腿部摇摆动画，并将上腿角度重置为 0
     */
    stopLegSwing() {
        // 停止并清空所有腿部动画
        if (this.legTweens.length > 0) {
            this.legTweens.forEach(tween => {
                if (tween && tween.isPlaying()) {
                    tween.stop();
                }
            });
            this.legTweens = [];
        }
    }

    /**
    * 启动手臂摇摆动画：
    * 先从当前角度平滑过渡到初始角度（左臂 -35°，右臂 35°），然后开始循环摆动
    */
    startArmSwing() {
        // 如果冻结状态，不执行动画
        if (this.isFrozen) return;

        // 清空之前的所有手臂动画
        this.stopArmSwing();

        // 左臂：平滑过渡到初始角度 -35°
        const leftArmTween1 = this.scene.tweens.add({
            targets: this.upperArmLeft,
            angle: -35,
            duration: 300,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                this.currentAngles.upperArmLeft = this.upperArmLeft.angle;
            },
            onComplete: () => {
                // 确保角度同步
                this.currentAngles.upperArmLeft = -35;
                // 开启循环：在 -35° 与 15° 之间摇摆
                const leftArmTween2 = this.scene.tweens.add({
                    targets: this.upperArmLeft,
                    angle: { from: -35, to: 15 },
                    duration: 650,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    onUpdate: () => {
                        this.currentAngles.upperArmLeft = this.upperArmLeft.angle;
                    }
                });
                this.armTweens.push(leftArmTween2);
            }
        });
        this.armTweens.push(leftArmTween1);

        // 右臂：平滑过渡到初始角度 35°
        const rightArmTween1 = this.scene.tweens.add({
            targets: this.upperArmRight,
            angle: 35,
            duration: 300,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                this.currentAngles.upperArmRight = this.upperArmRight.angle;
            },
            onComplete: () => {
                // 确保角度同步
                this.currentAngles.upperArmRight = 35;
                // 开启循环：在 35° 与 -15° 之间摇摆
                const rightArmTween2 = this.scene.tweens.add({
                    targets: this.upperArmRight,
                    angle: { from: 35, to: -15 },
                    duration: 650,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    onUpdate: () => {
                        this.currentAngles.upperArmRight = this.upperArmRight.angle;
                    }
                });
                this.armTweens.push(rightArmTween2);
            }
        });
        this.armTweens.push(rightArmTween1);
    }


    /**
     * 停止手臂摇摆动画，先停止循环 Tween，再平滑过渡到静止角度 -60°
     */
    stopArmSwing() {
        // 停止并清空所有手臂动画
        if (this.armTweens.length > 0) {
            this.armTweens.forEach(tween => {
                if (tween && tween.isPlaying()) {
                    tween.stop();
                }
            });
            this.armTweens = [];
        }
    }

    pauseArmSwing() {
        this.stopArmSwing(); // 使用新的stopArmSwing方法
    }

    /**
 * 启动身体和头部的小角度晃动动画
 */
    startBodySwing() {
        // 如果已有动画在播放，先停止
        if (this.armTweens.length > 0) {
            this.armTweens.forEach(tween => {
                if (tween && tween.isPlaying()) {
                    tween.stop();
                }
            });
            this.armTweens = [];
        }

        // 平滑过渡到初始角度 (body: -5°, head: -5°)
        this.scene.tweens.add({
            targets: this.body,
            angle: -5,
            duration: 400,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // 开启循环：在 -5° 与 5° 之间小幅度晃动
                this.scene.tweens.add({
                    targets: this.body,
                    angle: { from: -5, to: 0 },
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });

        this.scene.tweens.add({
            targets: this.head,
            angle: -5,
            duration: 400,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // 开启循环：在 -5° 与 5° 之间小幅度晃动
                this.scene.tweens.add({
                    targets: this.head,
                    angle: { from: -5, to: 0 },
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });
    }

    /**
     * 启动投掷动画：右手慢速顺时针旋转 180°，再快速逆时针旋转 180°，头部旋转 10°，结束后恢复普通摆动
     */
    startThrow() {
        // 如果冻结状态，不执行动画
        if (this.isFrozen) return;

        // 清空之前的所有手臂动画
        this.stopArmSwing();

        // 右手：慢速顺时针旋转 220°
        const throwTween1 = this.scene.tweens.add({
            targets: this.upperArmRight,
            angle: 220,
            duration: 1200,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                this.currentAngles.upperArmRight = this.upperArmRight.angle;
            },
            onComplete: () => {
                // 第二阶段：快速逆时针旋转回去
                const throwTween2 = this.scene.tweens.add({
                    targets: this.upperArmRight,
                    delay: 200,
                    angle: "-=220",
                    duration: 400,
                    ease: 'Sine.easeOut',
                    onUpdate: () => {
                        this.currentAngles.upperArmRight = this.upperArmRight.angle;
                    },
                    onComplete: () => {
                        // 动画结束，确保角度为 0°
                        this.upperArmRight.angle = 0;
                        this.currentAngles.upperArmRight = 0;
                        // 恢复普通摆动动画
                        if (!this.isFrozen) {
                            this.startArmSwing();
                        }
                    }
                });
                this.armTweens.push(throwTween2);
            }
        });
        this.armTweens.push(throwTween1);

        // 头部动画
        const headTween = this.scene.tweens.add({
            targets: this.head,
            angle: 10,
            duration: 700,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 0
        });
        // 保存头部动画引用（可以添加专门的headTweens数组）
    }

    /**
     * 启动左手砸击动画：
     * 左手平缓抬升到高处，然后快速向下砸击
     */
    /**
 * 启动左手砸击动画：
 * 左手从当前角度平缓过渡到 -60°，然后抬升到高处，再快速向下砸击
 */
    startLeftArmSmash(callback23?: () => void) {
        // 如果已有手臂动画在播放，先停止
        if (this.armTweens.length > 0) {
            this.armTweens.forEach(tween => {
                if (tween && tween.isPlaying()) {
                    tween.stop();
                }
            });
            this.armTweens = [];
        }

        // 第一步：从当前角度插值到初始角度 -60°
        const smashTween1 = this.scene.tweens.add({
            targets: this.upperArmLeft,
            angle: -60, // 平缓过渡到 -60°（手臂自然下垂）
            duration: 400, // 插值过渡时间 0.3 秒
            ease: 'Sine.easeInOut', // 平滑过渡
            onUpdate: () => {
                this.currentAngles.upperArmLeft = this.upperArmLeft.angle;
            },
            onComplete: () => {
                // 确保角度同步
                this.currentAngles.upperArmLeft = -60;

                // 第二步：平缓抬升到 30°（从 -60° 抬升 90°）
                const smashTween2 = this.scene.tweens.add({
                    targets: this.upperArmLeft,
                    angle: 80, // 抬升到 30°（手臂接近水平上方）
                    duration: 800, // 平缓抬升阶段 0.8 秒
                    ease: 'Sine.easeInOut', // 平滑过渡
                    onUpdate: () => {
                        this.currentAngles.upperArmLeft = this.upperArmLeft.angle;
                    },
                    onComplete: () => {
                        // 第三步：快速向下砸击到 -90°
                        const smashTween3 = this.scene.tweens.add({
                            targets: this.upperArmLeft,
                            angle: -90, // 快速砸向下方（超过初始位置）
                            duration: 300, // 快速砸击阶段 0.3 秒
                            ease: 'Sine.easeOut', // 快速但自然减速
                            onUpdate: () => {
                                this.currentAngles.upperArmLeft = this.upperArmLeft.angle;
                            },
                            onComplete: () => {
                                callback23 && callback23();
                                // 第四步：平缓回到初始角度 -60°
                                const smashTween4 = this.scene.tweens.add({
                                    targets: this.upperArmLeft,
                                    angle: -60, // 回到初始角度
                                    duration: 500, // 恢复阶段 0.5 秒
                                    ease: 'Sine.easeInOut',
                                    onUpdate: () => {
                                        this.currentAngles.upperArmLeft = this.upperArmLeft.angle;
                                    },
                                    onComplete: () => {
                                        // 可选：恢复普通手臂摆动
                                        if (!this.isFrozen) {
                                            this.startArmSwing();
                                        }
                                    }
                                });
                                this.armTweens.push(smashTween4);
                            }
                        });
                        this.armTweens.push(smashTween3);
                    }
                });
                this.armTweens.push(smashTween2);
            }
        });
        this.armTweens.push(smashTween1);
    }

    /**
     * 恢复腿部到初始角度：
     * 左右腿从当前角度平缓过渡到 0°（自然直立状态）
     */
    restoreLegsToInitial() {
        // 清空之前的所有腿部动画
        this.stopLegSwing();

        const targetLeftDegree = -10;
        const targetRightDegree = 20;

        // 左腿：平缓过渡到目标角度
        const leftLegTween = this.scene.tweens.add({
            targets: this.upperLegLeft,
            angle: targetLeftDegree,
            duration: 300,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                this.currentAngles.upperLegLeft = this.upperLegLeft.angle;
            },
            onComplete: () => {
                this.currentAngles.upperLegLeft = targetLeftDegree;
            }
        });
        this.legTweens.push(leftLegTween);

        // 右腿：平缓过渡到目标角度
        const rightLegTween = this.scene.tweens.add({
            targets: this.upperLegRight,
            angle: targetRightDegree,
            duration: 300,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                this.currentAngles.upperLegRight = this.upperLegRight.angle;
            },
            onComplete: () => {
                this.currentAngles.upperLegRight = targetRightDegree;
            }
        });
        this.legTweens.push(rightLegTween);
    }

    public startSlowEffect() {
        if (this.slowEffectTimer) {
            return;
        }

        this.slowEffectTimer = this.scene.time.addEvent({
            delay: 1000,  // Emit every second
            loop: true,
            callback: () => {
                const depth = this.body.depth + 1;
                const centerX = this.x;
                const centerY = this.y - this.scene.positionCalc.GRID_SIZEY / 2;
                const rangeWidth = this.scene.positionCalc.GRID_SIZEX;
                const rangeHeight = this.scene.positionCalc.GRID_SIZEY;
                const textSize = this.scene.positionCalc.GRID_SIZEX / 5;
                const textCount = 6;

                for (let i = 0; i < textCount; i++) {
                    let posX = Phaser.Math.Between(centerX - rangeWidth / 3, centerX + rangeWidth / 2);
                    let posY = Phaser.Math.Between(centerY - rangeHeight / 2, centerY + rangeHeight / 2);

                    let textObj = this.scene.add.text(posX, posY, '*', { fontSize: textSize + "px", color: "#4A90E2" }).setDepth(depth);
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
        });
    }

    // Stop slow effect animation
    public stopSlowEffect() {
        if (this.slowEffectTimer) {
            this.slowEffectTimer.remove();
            this.slowEffectTimer = null;
        }
    }

    startFrozenEffect() {
        // 停止所有的动作
        this.stopLegSwing();
        this.stopArmSwing();

        // 设置颜色和状态
        this.setTintColor(0x00FFFF);
        this.isFrozen = true;
    }

    stopFrozenEffect() {
        // 恢复颜色
        this.setTintColor(0xFFFFFF);
        this.isFrozen = false;

        // 恢复动画
        this.startArmSwing();
        this.startLegSwing();
    }

    setTintColor(color: number) {
        this.body.setTint(color);
        this.head.setTint(color);
        this.upperArmLeft.setTint(color);
        this.upperArmRight.setTint(color);
        this.upperLegLeft.setTint(color);
        this.upperLegRight.setTint(color);
        this.lowerArmLeft.setTint(color);
        this.lowerArmRight.setTint(color);
        this.lowerLegLeft.setTint(color);
        this.lowerLegRight.setTint(color);
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
        this.stopArmSwing();
        this.stopLegSwing();

        this.scene.tweens.killTweensOf([
            this.body,
            this.head,
            this.upperArmLeft,
            this.upperArmRight,
            this.upperLegLeft,
            this.upperLegRight,
            this.lowerArmLeft,
            this.lowerArmRight,
            this.lowerLegLeft,
            this.lowerLegRight
        ]);

        // 销毁所有组件
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
        this.legTweens.forEach(tween => tween.stop());
        this.armTweens.forEach(tween => tween.stop());

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