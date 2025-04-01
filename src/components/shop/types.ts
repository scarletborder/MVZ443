// src/types/shop.ts
import { GameManager, GameProgress } from "../../context/save_ctx";

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