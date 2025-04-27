import { Game } from "../../../scenes/Game";
import { IPlant } from "../../../models/IPlant";
import { IRecord } from "../../../models/IRecord";

import { item } from "../../../../components/shop/types";
import { GetIncValue } from "../../../../utils/numbervalue";
import { SECKILL } from "../../../../../public/constants";

class _Lily extends IPlant {
    game: Game;
    constructor(scene: Game, col: number, row: number, texture: string, pid: number, level: number) {
        super(scene, col, row, texture, pid, level);
        this.setHealthFirstly(GetIncValue(300, 2, level));
        this.game = scene;
        this.plant_height = 1;
        this.setDepth(this.depth - 2);
    }

    public onStarShards(): void {
        super.onStarShards();
        if (!this.game) return;

        const game = this.game;
        // 为周围一片种植lily
        for (let i = this.col - 1; i <= this.col + 1; i++) {
            for (let j = this.row - 1; j <= this.row + 1; j++) {
                if (i >= 0 && i < game.positionCalc.Col_Number && j >= 0 && j < game.positionCalc.Row_Number && (i !== this.col || j !== this.row)) {
                    if (game.gridProperty[j][i] !== 'water') continue;

                    const key = `${i}-${j}`;
                    // 查找list
                    let couldPlant = true;
                    if (game.gardener.planted.has(key)) {
                        const list = game.gardener.planted.get(key);
                        if (list) {
                            // 没有Lily
                            for (const plant of list) {
                                if (plant.pid === Lily.pid) {
                                    couldPlant = false;
                                    break;
                                }
                            }
                        }
                    }
                    if (couldPlant) {
                        NewLily(game, i, j, this.level);
                    }
                }
            }
        }
    }
}


function cost(level?: number): number {
    if ((level || 1) >= 5) return 0;
    return 25;
}

function NewLily(scene: Game, col: number, row: number, level: number): IPlant {
    const lily = new _Lily(scene, col, row, 'plant/lily', Lily.pid, level);
    return lily;
}


const Lily: IRecord = {
    pid: 6,
    nameKey: 'name_lily',
    cost: cost,
    cooldownTime: () => 4,
    NewFunction: NewLily,
    texture: 'plant/lily',
    descriptionKey: 'lily_description',

};

export default Lily;