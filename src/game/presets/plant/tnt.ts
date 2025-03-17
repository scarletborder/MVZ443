import seedrandom from "seedrandom";
import { SECKILL } from "../../../../public/constants";
import { item } from "../../../components/shop/types";
import i18n from "../../../utils/i18n";
import { GetDecValue, GetIncValue } from "../../../utils/numbervalue";
import { IExpolsion, NewExplosionByGrid } from "../../models/IExplosion";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import { Game } from "../../scenes/Game";
import { SHIELD_PLANT } from "../../utils/grid_clan";
import Lily from "./lily";

class _Tnt extends IPlant {
    game: Game;
    damage: number = 3000;
    random: seedrandom.PRNG;


    constructor(scene: Game, col: number, row: number, level: number) {
        super(scene, col, row, TntRecord.texture, TntRecord.pid, level);
        this.game = scene;
        this.setHealthFirstly(SECKILL);
        this.damage = GetIncValue(3000, 1.5, level);
        this.damage *= (level >= 5 ? 1.3 : 1);
        this.random = seedrandom.alea(String(scene.seed))

        const x = this.x;
        const _row = this.row;

        // 设定闪烁效果，并添加回调函数
        scene.tweens.add({
            targets: this,
            alpha: { from: 1, to: 0.2 },  // 从原状态到白色高光
            duration: 300,                // 每次闪烁的时长
            yoyo: true,                   // 使得动画完成后反向播放
            repeat: 3,                    // 重复5次（从原状态到高光，再回来，总共3次）
            ease: 'Sine.easeInOut',       // 缓动效果
            onComplete: () => {           // 动画完成后触发的回调函数
                new IExpolsion(this.game, x, _row, {
                    damage: this.damage,
                    rightGrid: 1.5,
                    leftGrid: 1.5,
                    upGrid: 1
                });
                this.eliteClusterBomb();
                this.destroyPlant();
            }
        });

    }

    public onStarShards(): void {
        super.onStarShards();
        function getExplosionTargets(game: Game, col: number, row: number) {
            const targets = [];
            if (col === game.GRID_COLS - 1) {
                // 最右边的列：在左侧生成爆炸，针对上下边缘分别处理
                if (row === 0) {
                    targets.push([col - 2, row]);
                    targets.push([col, row + 2]);
                } else if (row === game.GRID_ROWS - 1) {
                    targets.push([col - 2, row]);
                    targets.push([col, row - 2]);
                } else {
                    targets.push([col - 1, Math.max(row - 2, 0)]);
                    targets.push([col - 1, Math.min(row + 2, game.GRID_ROWS - 1)]);
                }
            } else {
                // 非最右边的列：向前生成爆炸
                const newCol = Math.min(col + 2, game.GRID_COLS - 1);
                if (row === 0) {
                    targets.push([newCol, row]);
                    targets.push([newCol, row + 2]);
                } else if (row === game.GRID_ROWS - 1) {
                    targets.push([newCol, row]);
                    targets.push([newCol, row - 2]);
                } else {
                    targets.push([newCol, Math.max(row - 2, 0)]);
                    targets.push([newCol, Math.min(row + 2, game.GRID_ROWS - 1)]);
                }
            }
            return targets;
        }

        // 使用辅助函数生成爆炸效果
        const targets = getExplosionTargets(this.game, this.col, this.row);
        targets.forEach(([targetCol, targetRow]) => {
            NewExplosionByGrid(this.game, targetCol, targetRow, {
                damage: this.damage,
                rightGrid: 1.5,
                leftGrid: 1.5,
                upGrid: 1
            });
            this.game.time.delayedCall(3900, () => {
                NewExplosionByGrid(this.game, targetCol, targetRow, {
                    damage: this.damage / 3,
                    rightGrid: 1.5,
                    leftGrid: 1.5,
                    upGrid: 1
                });
            });
        });

    }

    public eliteClusterBomb() {
        if (this.level >= 7) {
            this.game.time.delayedCall(3900, () => {
                new IExpolsion(this.game, this.x, this.row, {
                    damage: this.damage / 3,
                    rightGrid: 1.5,
                    leftGrid: 1.5,
                    upGrid: 1
                })
            })
        }

    }
}

function NewTnt(scene: Game, col: number, row: number, level: number): IPlant {
    const furnace = new _Tnt(scene, col, row, level);
    return furnace;
}

function cost(level?: number): number {
    return 150;
}

function cooldownTime(level?: number): number {
    return GetDecValue(30, 0.85, level || 1);
}


function levelAndstuff(level: number): item[] {
    switch (level) {
        case 1:
            return [{
                type: 1,
                count: 200
            }, {
                type: 3,
                count: 2
            }];
    }
    return [{
        type: SECKILL,
        count: 1
    }];
    return [];
}

const TntRecord: IRecord = {
    pid: 7,
    name: '瞬炸TNT',
    cost: cost,
    cooldownTime: cooldownTime,
    NewFunction: NewTnt,
    texture: 'plant/tnt',
    description: i18n.S('tnt_description'),
    needFirstCoolDown: true,
    NextLevelStuff: levelAndstuff
};

export default TntRecord;