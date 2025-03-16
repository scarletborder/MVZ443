import { Game } from "../../scenes/Game";
import { IPlant } from "../../models/IPlant";
import { IRecord } from "../../models/IRecord";
import i18n from "../../../utils/i18n";

class _Lily extends IPlant {
    constructor(scene: Game, col: number, row: number, texture: string, pid: number, level: number) {
        super(scene, col, row, texture, pid, level);
        this.setHealthFirstly(300);
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