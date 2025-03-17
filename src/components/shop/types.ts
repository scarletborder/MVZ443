// src/types/shop.ts
import { SECKILL } from "../../../public/constants";
import { GameManager, GameProgress } from "../../context/save_ctx";
import { DistributePoints } from "../../utils/random";

export interface item {
    type: number;
    count: number;
}

export interface price {
    items: item[];
}

export interface IGoods {
    id: number;
    name: string;
    price: number;
    description: () => string;
    hasBought: (id: number, progress: GameProgress) => boolean;
    afterBought: (id: number, save: GameManager) => void;
    getPriceStructure: () => price;
    canPurchase: (progress: GameProgress) => boolean; // Added to interface
}

// Concrete implementations
class SeventhSlot implements IGoods {
    id: number = 1;
    name: string = "7th Slot";
    price: number = 220;

    constructor(
        private purchasedIds: Set<number>,
        private onPurchase: (id: number) => void
    ) { }

    description = () => "七槽\n解锁chapter1-stage4";
    hasBought = (id: number, progress: GameProgress) => {
        return this.purchasedIds.has(id) || progress.slotNum >= 7;
    };
    afterBought = (id: number, save: GameManager) => {
        this.purchasedIds.add(id);
        this.onPurchase(id);
        save.updateSlotNum(7);
    };
    getPriceStructure = (): price => ({
        items: [{ type: 1, count: this.price }, { type: 2, count: 1 }]
    });
    canPurchase = (progress: GameProgress) => {
        if (progress.level.has(4) && progress.slotNum === 6) return true;
        return false;
    }
}

class EighthSlot implements IGoods {
    id: number = 2;
    name: string = "8th Slot";
    price: number = 450;

    constructor(
        private purchasedIds: Set<number>,
        private onPurchase: (id: number) => void
    ) { }

    description = () => "8槽\n解锁chapter1-stage5";
    hasBought = (id: number, progress: GameProgress) => {
        return this.purchasedIds.has(id) || progress.slotNum >= 8;
    };
    afterBought = (id: number, save: GameManager) => {
        this.purchasedIds.add(id);
        this.onPurchase(id);
        save.updateSlotNum(8);
    };
    getPriceStructure = (): price => ({
        items: [{ type: 1, count: this.price }]
    });
    canPurchase = (progress: GameProgress) => {
        if (progress.level.has(5) && progress.slotNum === 7) return true;
        return false;
    }
}

class Cp1Kit implements IGoods {
    id: number = 3;
    name: string = "Chapter 1 Kit";
    price: number = 200;

    constructor(
        private purchasedIds: Set<number>,
        private onPurchase: (id: number) => void
    ) { }

    description = () => "Chapter 1 Kit\n随机获得第一章普通关卡的升级材料(leather or iron)3件\n解锁chapter1-3";
    hasBought = (id: number, progress: GameProgress) => {
        return false;
    };
    afterBought = (id: number, save: GameManager) => {
        this.purchasedIds.add(id);
        this.onPurchase(id);
        const points = DistributePoints(2, 3);
        if (points[0] > 0) {
            save.updateItemCount(2, points[0]);
        }
        if (points[1] > 0) {
            save.updateItemCount(3, points[1]);
        }
    };
    getPriceStructure = (): price => ({
        items: [{ type: 1, count: this.price }]
    });
    canPurchase = (progress: GameProgress) => {
        if (progress.level.has(3)) return true;
        return false;
    }
}

class ScarletborderCrystal implements IGoods {
    id: number = SECKILL;
    name: string = "黯绯结晶";
    price: number = 1;

    constructor(
        private purchasedIds: Set<number>,
        private onPurchase: (id: number) => void
    ) { }

    description = () => "体验版专属物品\n用于升级器械\n体验版限制了升级器械的等级上限，使用黯绯结晶可以解除这一限制\n注意:升级后的器械严重超出体验版设计的强度\n解锁stage1-5";
    hasBought = (id: number, progress: GameProgress) => {
        return false;
    };
    afterBought = (id: number, save: GameManager) => {
        this.purchasedIds.add(id);
        this.onPurchase(id);
        save.updateItemCount(SECKILL, 1);
    };
    getPriceStructure = (): price => ({
        items: [{ type: 1, count: this.price }]
    });
    canPurchase = (progress: GameProgress) => {
        if (progress.level.has(5)) return true;
        return false;
    }
}




export function NewGoodLists(purchasedIds: Set<number>, onPurchase: (id: number) => void): IGoods[] {
    return [
        new SeventhSlot(purchasedIds, onPurchase),
        new EighthSlot(purchasedIds, onPurchase),
        new Cp1Kit(purchasedIds, onPurchase),
        new ScarletborderCrystal(purchasedIds, onPurchase)
    ];
}