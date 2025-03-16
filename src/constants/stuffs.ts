import { SECKILL } from "../../public/constants";

const idToName = new Map<number, string>(
    [[1, 'Gold'],
    [2, 'Leather'],
    [3, 'Iron'],

    [SECKILL, '黯绯结晶'],
    ]);

export default function Stuff(id: number) {
    return idToName.get(id) || 'Unknown';
}