import { Game } from "../../scenes/Game";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import i18n from "../../../utils/i18n";

class _Lily extends IPlant {
    game: Game;
    constructor(scene: Game, col: number, row: number, texture: string, pid: number, level: number) {
        super(scene, col, row, texture, pid, level);
        this.setHealthFirstly(300);
        this.game = scene;
    }

    public onStarShards(): void {
        super.onStarShards();
        // 为周围一片种植lily
        for (let i = this.col - 1; i <= this.col + 1; i++) {
            for (let j = this.row - 1; j <= this.row + 1; j++) {
                if (i >= 0 && i < this.game.positionCalc.Col_Number && j >= 0 && j < this.game.positionCalc.Row_Number && (i !== this.col || j !== this.row)) {
                    if (this.game.gridProperty[j][i] !== 'water') continue;

                    const key = `${i}-${j}`;
                    // 查找list
                    let couldPlant = true;
                    if (this.game.gardener.planted.has(key)) {
                        const list = this.game.gardener.planted.get(key);
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
                        NewLily(this.game, i, j, this.level);
                    }
                }
            }
        }
    }
}


function cost(level?: number): number {
    return 25;
}

function NewLily(scene: Game, col: number, row: number, level: number): IPlant {
    const lily = new _Lily(scene, col, row, 'plant/lily', Lily.pid, level);
    return lily;
}

const Lily: IRecord = {
    pid: 6,
    name: '睡莲',
    cost: cost,
    cooldownTime: () => 4,
    NewFunction: NewLily,
    texture: 'plant/lily',
    description: i18n.S('lily_description')
};

export default Lily;