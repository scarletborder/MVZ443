import Stuff from "../../constants/stuffs";
import { item } from "./types";

type Props = {
    items: item[]
    currentItems: item[]
}

export default function StuffList({ items, currentItems }: Props) {
    // Convert currentItems into a map for efficient lookup
    const currentItemsMap = new Map(currentItems.map(item => [item.type, item.count]));

    const stuffItem = (type: number, requiredCount: number) => {
        const availableCount = currentItemsMap.get(type) || 0;
        const isInsufficient = requiredCount > availableCount;

        return (
            <div style={{ color: isInsufficient ? 'red' : 'white' }}>
                <span>{`${Stuff(type)}: ${availableCount}/${requiredCount}`}</span>
                {isInsufficient && <span> (missing or insufficient)</span>}
            </div>
        );
    }

    return (
        <div>
            {items.map((item, index) => (
                <div key={index}>
                    {stuffItem(item.type, item.count)}
                </div>
            ))}
        </div>
    );
}