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

export function CurrentStuffs(items: item[]) {
    return (
        <div style={{
            backgroundColor: '#000000',
            padding: '2%',
            borderRadius: '8px',
            maxWidth: '400px',
            margin: '20px auto',
            fontFamily: 'Arial, sans-serif'
        }}>
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                color: '#ffffff'
            }}>
                <thead>
                    <tr>
                        <th style={{
                            backgroundColor: '#1a1a1a',
                            padding: '12px',
                            textAlign: 'left',
                            fontWeight: 'bold',
                            borderBottom: '2px solid #333333'
                        }}>Type</th>
                        <th style={{
                            backgroundColor: '#1a1a1a',
                            padding: '12px',
                            textAlign: 'left',
                            fontWeight: 'bold',
                            borderBottom: '2px solid #333333'
                        }}>Count</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index} style={{
                            transition: 'background-color 0.3s'
                        }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <td style={{
                                padding: '10px',
                                borderBottom: '1px solid #333333'
                            }}>{Stuff(item.type)}</td>
                            <td style={{
                                padding: '10px',
                                borderBottom: '1px solid #333333'
                            }}>{item.count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
