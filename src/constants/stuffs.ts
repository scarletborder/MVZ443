import { SECKILL } from "../../public/constants";
import { commonKey, stuffKey } from "../i18n/keys";


const idToName = new Map<number, string>(
    [[1, 'gold'],
    [2, 'leather'],
    [3, 'iron'],
    [4, 'obsidian_medal'],
    [5, 'echo_shard'],
    [6, 'dragon_ball'],
    [7, "Mechanical_Gear"],
    [8, "Tengu_Fluff"],
    [9, "Optical_Lens"],
    [10, "NIXXOR_Lens"],
    [11, "Miracle_Omikuji"],
    [SECKILL, 'scb'],
    ]);



export default function Stuff(id: number, translate: (key: string, params?: Record<string, string>) => string) {
    const key = idToName.get(id);
    return translate(key ? stuffKey(key) : commonKey('unknown'));
}