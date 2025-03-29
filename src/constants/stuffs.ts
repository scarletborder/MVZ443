import { SECKILL } from "../../public/constants";
import i18n from "../utils/i18n";

const idToName = new Map<number, string>(
    [[1, 'gold'],
    [2, 'leather'],
    [3, 'iron'],
    [4, 'obsidian_medal'],
    [5, 'echo_shard'],
    [SECKILL, 'scb'],
    ]);

function stuffLocale(key: string) {
    return i18n(key);
}

export default function Stuff(id: number) {
    return stuffLocale(idToName.get(id) || 'unknown');
}