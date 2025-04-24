import DepthManager from "../../utils/depth";
import { defaultRandom } from "../../utils/random";
import IObstacle from "../presets/obstacle/IObstacle";
import { Game } from "../scenes/Game";
import { IPlant } from "./IPlant";
import { IMonster } from "./monster/IMonster";

export type explosionParams = {
    damage: number,
    rightGrid: number // 中心向右, 如,想要包括本格和右边一格,则为1.5
    leftGrid: number // 中心向左
    upGrid: number // 中心向上,必须>=0的实数,为0意思是仅本行,1为本行和上一行
    downGrid?: number // [为空时等于up]中心向下,必须>=0的实数,为0意思是仅本行
    targetCamp?: 'plant' | 'zombie' // 目标阵营,默认打僵尸 
    disableAnime?: boolean // 是否禁用爆炸特效,默认不禁用
}

export class IExpolsion extends Phaser.Physics.Arcade.Sprite {
    // 爆炸的属性
    public damage: number = 1500;
    public center_x: number;
    public center_row: number;
    public hasAttacked: Set<Phaser.Physics.Arcade.Sprite> = new Set();

    public static Group: Phaser.Physics.Arcade.Group;

    public targetCamp: 'plant' | 'zombie' = 'zombie';

    static InitGroup(scene: Game) {
        this.Group = scene.physics.add.group({
            classType: IExpolsion,
            runChildUpdate: true
        })
    }

    constructor(
        scene: Game,
        x: number,
        row: number,
        params: explosionParams,
        onCompleteCallback?: () => void // 新增回调函数参数
    ) {
        // Calculate center y position
        const y = (row + 1 / 2) * scene.positionCalc.GRID_SIZEY + scene.positionCalc.gridOffsetY;
        super(scene, x, y, "");
        this.damage = params.damage;
        // Store center coordinates
        this.center_x = x;
        this.center_row = row;

        // Add to scene and physics
        const gridSizeX = scene.positionCalc.GRID_SIZEX;
        const gridSizeY = scene.positionCalc.GRID_SIZEY;


        // Get explosion range
        let { rightGrid, leftGrid, upGrid, downGrid, disableAnime } = params;
        if (!downGrid) downGrid = upGrid;

        const rightWidth = rightGrid * scene.positionCalc.GRID_SIZEX;
        const leftWidth = leftGrid * scene.positionCalc.GRID_SIZEX;
        const upHeight = (upGrid + 1 / 3) * scene.positionCalc.GRID_SIZEY;
        const downHeight = (downGrid + 1 / 3) * scene.positionCalc.GRID_SIZEY;
        const _disableAnime = disableAnime ?? false;


        // Calculate collision box dimensions
        const totalWidth = rightWidth + leftWidth;
        const totalHeight = upHeight + downHeight;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        // Set up invisible physics collision box
        this.setSize(totalWidth, totalHeight)
            .setOrigin(0, 0)
            .setVisible(false) // Make the sprite invisible
            .setOffset(-leftWidth, -upHeight); // Position the box correctly relative to center


        IExpolsion.Group.add(this, true);

        scene.frameTicker.delayedCall({
            delay: 50,
            callback: () => {
                this.destroy();
                if (onCompleteCallback) {
                    onCompleteCallback();
                }
            }
        });

        if (_disableAnime === true) return;
        // 音效
        const audio_name = `explode${Math.floor(Math.random() * 3) + 1}`;
        scene.musical.explodeAudio.play(audio_name);

        // Set up and play animation
        // 创建多个动画对象
        // 创建密集的爆炸效果
        const explosionSprites: Phaser.GameObjects.Sprite[] = [];
        const spriteBaseSize = Math.min(gridSizeX, gridSizeY) * 0.6; // 基础大小
        const areaWidth = totalWidth;
        const areaHeight = totalHeight;

        // 使用网格+随机偏移来确保覆盖
        const cols = Math.ceil(areaWidth / spriteBaseSize);
        const rows = Math.ceil(areaHeight / spriteBaseSize);
        const density = 1.5; // 增加密度，确保重叠

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // 计算基础网格位置
                const baseX = x - leftGrid * gridSizeX + (col + 0.5) * spriteBaseSize;
                const baseY = y - downGrid * gridSizeY + (row + 0.5) * spriteBaseSize;

                // 添加多个爆炸以增加密度
                const explosionsPerCell = Math.floor(density);
                const extraExplosion = defaultRandom() < (density - explosionsPerCell) ? 1 : 0;
                const totalExplosions = explosionsPerCell + extraExplosion;

                for (let i = 0; i < totalExplosions; i++) {
                    // 添加随机偏移
                    const offsetX = (defaultRandom() - 0.5) * spriteBaseSize * 0.8;
                    const offsetY = (defaultRandom() - 0.5) * spriteBaseSize * 0.8;
                    const randomX = baseX + offsetX;
                    const randomY = baseY + offsetY;

                    // 确保位置在区域内
                    const finalX = Math.max(x - leftGrid * gridSizeX,
                        Math.min(randomX, x + rightGrid * gridSizeX));
                    const finalY = Math.max(y - downGrid * gridSizeY,
                        Math.min(randomY, y + upGrid * gridSizeY));

                    // 添加随机缩放和旋转
                    const scale = 0.8 + defaultRandom() * 0.6; // 0.8-1.4倍随机缩放
                    const spriteSize = spriteBaseSize * scale;

                    const anime = scene.add.sprite(finalX, finalY, 'anime/explosion');
                    anime.setDisplaySize(spriteSize, spriteSize)
                        .setOrigin(0.5, 0.5)
                        .setDepth(DepthManager.getInGameUIElementDepth(-100))
                        .setRotation(defaultRandom() * Math.PI * 2);

                    explosionSprites.push(anime);
                }
            }
        }

        // 创建并播放动画
        if (!scene.anims.exists('explosion')) {
            scene.anims.create({
                key: 'explosion',
                frames: scene.anims.generateFrameNumbers("anime/explosion", { start: 0, end: 15 }),
                frameRate: 30,
                repeat: 0
            });
        }

        explosionSprites.forEach((anime, index) => {
            const delay = 150 * defaultRandom(); // 0-150ms随机延迟
            scene.time.delayedCall(delay, () => {
                anime.play('explosion');
                anime.once('animationcomplete', () => {
                    anime.destroy();
                });
            });
        });
    }

    CollideObject(object: IMonster | IPlant | IObstacle) {
        if (this.hasAttacked.has(object)) return;
        // 炸僵尸
        if (object instanceof IMonster && this.targetCamp === 'zombie') {
            object.takeDamage(this.damage, 'explosion', this);
            this.hasAttacked.add(object);
        } else if (object instanceof IPlant && this.targetCamp === 'plant') {
            object.takeDamage(this.damage, null);
            this.hasAttacked.add(object);
        } else if (object instanceof IObstacle && this.targetCamp === 'zombie') {
            object.takeDamage(this.damage, 'explosion');
            this.hasAttacked.add(object);
        }
    }


}

export function NewExplosionByGrid(scene: Game, col: number, row: number, params: explosionParams, onCompleteCallback?: () => void) {
    const x = (col + 1 / 2) * scene.positionCalc.GRID_SIZEX + scene.positionCalc.gridOffsetX;
    return new IExpolsion(scene, x, row, params, onCompleteCallback);
}