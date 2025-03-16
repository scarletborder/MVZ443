// utils/grid_clan.ts
/**
 * 整合gardener,spawner,posiotion中关于格子的信息
 */

import { IPlant } from "../models/IPlant";
import Gardener from "./gardener";

// 护盾器械,铲除上方时铲除,可以和任何非护盾器械兼容
const SHIELD_PLANT: number[] = []; // 护盾植物
const GROUND_ONLY_PLANT: number[] = [4];// 地面植物,只能种植在地面
const WATER_ONLY_PLANT: number[] = [6];// 水中植物,只能种植在水中
const SKY_ONLY_PLANT: number[] = [100]; // 船只,只能种植在天空中
const POWDER_PLANT: number[] = [10]; // 粉尘植物,可以随意种植

const lilyPid = 6;
const boatPid = 100;


export default class GridClan {
    gardener: Gardener;
    constructor(gardener: Gardener) {
        this.gardener = gardener;
    }

    public hasBoat(col: number, row: number): boolean;
    public hasBoat(plants: IPlant[]): boolean;
    public hasBoat(arg1: any, arg2?: any): boolean {
        if (typeof arg1 === 'number') {
            const col = arg1;
            const row = arg2;
            const key = `${col}-${row}`;
            if (this.gardener.planted.has(key)) {
                const list = this.gardener.planted.get(key);
                if (list) {
                    for (const plant of list) {
                        if (plant.pid === boatPid) {
                            return true;
                        }
                    }
                }
            }
            return false;
        } else {
            const plants = arg1;
            for (const plant of plants) {
                if (plant.pid === boatPid) {
                    return true;
                }
            }
            return false;
        }
    }

    public hasLily(col: number, row: number): boolean;
    public hasLily(plants: IPlant[]): boolean;
    public hasLily(arg1: any, arg2?: any): boolean {
        if (typeof arg1 === 'number') {
            const col = arg1;
            const row = arg2;
            const key = `${col}-${row}`;
            if (this.gardener.planted.has(key)) {
                const list = this.gardener.planted.get(key);
                if (list) {
                    for (const plant of list) {
                        if (plant.pid === lilyPid) {
                            return true;
                        }
                    }
                }
            }
            return false;
        } else {
            const plants = arg1;
            for (const plant of plants) {
                if (plant.pid === lilyPid) {
                    return true;
                }
            }
            return false;
        }
    }

    // 是否是承载物
    public isCarrier(pid: number): boolean {
        return pid === lilyPid || pid === boatPid;
    }

    public isPowder(pid: number): boolean {
        return POWDER_PLANT.includes(pid);
    }

    public CanPlant(pid: number, col: number, row: number): boolean {
        const key = `${col}-${row}`;
        const plants = this.gardener.planted.get(key) || [];

        // 不考虑任何承载物的情况下,指定plant能否放置
        const canPlant = (pid: number, plants: IPlant[]) => {
            // 先考虑所有特殊植物
            // 粉尘植物,随意种植
            if (POWDER_PLANT.includes(pid)) {
                return true;
            }

            // lily,只能在水体放置,并且要求该gird 无其他植物
            if (pid === lilyPid) {
                return this.gardener.scene.gridProperty[row][col] === 'water' && plants.length === 0;
            }

            // TODO: other water only plant

            // boat,could only be planted on 'sky', meanwhile, there should be no other 'boat' in the grid
            if (pid === boatPid) {
                return this.gardener.scene.gridProperty[row][col] === 'sky' && !this.hasBoat(plants);
            }

            // TODO: other sky only plant

            // shield could by planted on any type of grid, and can be planted together with any other plants except another shield
            // traverse all pid in plants
            if (SHIELD_PLANT.includes(pid)) {
                for (const plant of plants) {
                    if (SHIELD_PLANT.includes(plant.pid)) {
                        return false;
                    }
                }
                return true;
            }
            // normal plant
            // 本格中没有除了上述特殊plant外的其他plant
            for (const plant of plants) {
                if (plant.pid !== lilyPid && plant.pid !== boatPid && !SHIELD_PLANT.includes(plant.pid)) {
                    return false;
                }
            }
            return true;
        };

        // 首先判断目标grid的Property
        if (this.gardener.scene.gridProperty[row][col] === 'water') {
            // 一些奇怪的冲突,即只能种植在ground中的植物
            if (GROUND_ONLY_PLANT.includes(pid)) {
                return false;
            }
            if (WATER_ONLY_PLANT.includes(pid)) {
                return canPlant(pid, plants);
            }

            if (this.hasLily(plants)) {
                return canPlant(pid, plants);
            }
            return false;
        } else if (this.gardener.scene.gridProperty[row][col] === 'sky') {
            if (GROUND_ONLY_PLANT.includes(pid)) {
                return false;
            }

            if (SKY_ONLY_PLANT.includes(pid)) {
                return canPlant(pid, plants);
            }

            // 其实可以直接种植,只不过被火烧而已
            return canPlant(pid, plants);
        } else {
            // ground
            return canPlant(pid, plants);
        }
    }

    public gridWisePid(px: number, py: number): {
        pid: number,
        col: number,
        row: number
    } {
        // 得到鼠标指针指向的pid
        // 当 格子中包含多个植物的时候(护盾和主要植物)此函数根据pointer的y判断应该对哪个目标进行操作
        // 返回值为pid
        // 同时注意还要关注即使鼠标指针选了某个位置,但是他是承载物,那么依然选别的位置
        const { col, row } = this.gardener.positionCalc.getGridByPos(px, py);
        if (col >= 0 && row >= 0 && col < this.gardener.positionCalc.Col_Number && row < this.gardener.positionCalc.Row_Number) {
            const { y } = this.gardener.positionCalc.getGridCenter(col, row);
            const removeShield = py < y; // 鼠标在格子上方,优先移除护盾
            const key = `${col}-${row}`;
            // 获得 pid
            if (this.gardener.planted.has(key)) {
                const list = this.gardener.planted.get(key) || [];
                if (list.length > 0) {
                    if (list.length === 1) {
                        // 直接铲除唯一的植物
                        return {
                            pid: list[0].pid,
                            col: col,
                            row: row
                        }
                    } else {
                        // 处理多个植物情况
                        // 有承载物,而只有两个plant,优先返回非承载物
                        if (list.length === 2 && (this.hasBoat(list) || this.hasLily(list))) {
                            return {
                                pid: this.isCarrier(list[0].pid) ? list[1].pid : list[0].pid,
                                col: col,
                                row: row
                            }
                        }
                        // 有护盾,Normal plant(以及还有承载物)
                        if (removeShield) {
                            for (const plant of list) {
                                if (SHIELD_PLANT.includes(plant.pid)) {
                                    return {
                                        pid: plant.pid,
                                        col: col,
                                        row: row
                                    }
                                }
                            }
                        } else {
                            // 即使是移除下面的目标,如果只有承载物和护盾,也会在上面的逻辑中返回护盾
                            for (const plant of list) {
                                if (!SHIELD_PLANT.includes(plant.pid) && (!this.isCarrier(plant.pid))) {
                                    return {
                                        pid: plant.pid,
                                        col: col,
                                        row: row
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        // empty
        return {
            pid: -1,
            col: -1,
            row: -1
        }
    }
    // 僵尸攻击plant,如果有新的接触plant,判断是否应该转移
    public MorePriorityPlant(prevPlant: IPlant, newPlant: IPlant): boolean {
        // 承载物之上有了新的植物,无条件转移
        if (this.isCarrier(prevPlant.pid) && !this.isCarrier(newPlant.pid)) {
            return true;
        }
        // 新plant是护盾,如果prev不是护盾,转
        if (SHIELD_PLANT.includes(newPlant.pid) && !SHIELD_PLANT.includes(prevPlant.pid)) {
            return true;
        }
        return false;
    }
}