// src/types/shop.ts
import { GameProgress } from "../../context/save_ctx";

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
    afterBought: (id: number, progress: GameProgress) => void;
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

    description = () => "七槽\n需要通过chapter1-stage4解锁";
    hasBought = (id: number, progress: GameProgress) => {
        return this.purchasedIds.has(id) || progress.slotNum >= 7;
    };
    afterBought = (id: number, progress: GameProgress) => {
        this.purchasedIds.add(id);
        this.onPurchase(id);
        progress.slotNum = 7;
    };
    getPriceStructure = (): price => ({
        items: [{ type: 1, count: this.price }]
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

    description = () => "8槽\n需要通过chapter1-stage5解锁";
    hasBought = (id: number, progress: GameProgress) => {
        return this.purchasedIds.has(id) || progress.slotNum >= 8;
    };
    afterBought = (id: number, progress: GameProgress) => {
        this.purchasedIds.add(id);
        this.onPurchase(id);
        progress.slotNum = 8;
    };
    getPriceStructure = (): price => ({
        items: [{ type: 1, count: this.price }]
    });
    canPurchase = (progress: GameProgress) => {
        if (progress.level.has(5) && progress.slotNum === 7) return true;
        return false;
    }
}



export function NewGoodLists(purchasedIds: Set<number>, onPurchase: (id: number) => void): IGoods[] {
    return [
        new SeventhSlot(purchasedIds, onPurchase),
        new EighthSlot(purchasedIds, onPurchase),
    ];
}