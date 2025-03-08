import { IRefPhaserGame } from '../game/PhaserGame';
import Card from './card';

interface slotProps {
    sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
};

export function CardSlotHorizontal({ sceneRef }: slotProps) {
    // 通过选关界面获得的植物信息
    const plants = [
        { name: '豌豆射手', cooldown: 5, pid: 1 },
        { name: '向日葵', cooldown: 7, pid: 2 },
        { name: '坚果', cooldown: 10, pid: 3 },
        { name: '樱桃炸弹', cooldown: 15, pid: 4 },
    ];

    let line_1 = 9// 第一行, 阳光显示 + 9个卡槽
    let line_2 = 9// 列, 铲子 + 9个卡槽

    return (<div style={{
        display: 'flex',
        flexDirection: "row",
        backgroundColor: '#f0f0f0',
        justifyContent: 'flex-start',
        width: '100%',
        height: "100%",
        alignItems: "center",
    }} >
        {plants.map((plant, index) => (
            <Card
                key={index}
                plantName={plant.name}
                cooldownTime={plant.cooldown}
                sceneRef={sceneRef}
                pid={plant.pid}
                textureKey='plant/peashooter'
            />
        ))}
    </div>);
}

// export function CardSlotVertical({ scene }: slotProps) {
//     const plants = [
//         { name: '向日葵', cooldown: 7 },
//         { name: '豌豆射手', cooldown: 5 },
//         { name: '坚果', cooldown: 10 },
//         { name: '樱桃炸弹', cooldown: 15 },
//         { name: '向日葵2', cooldown: 7 },
//         { name: '豌豆射手2', cooldown: 5 },
//         { name: '坚果2', cooldown: 10 },
//         { name: '樱桃炸弹2', cooldown: 15 },
//         { name: '向日葵', cooldown: 7 },
//         { name: '豌豆射手', cooldown: 5 },
//         { name: '坚果', cooldown: 10 },
//         { name: '樱桃炸弹', cooldown: 15 },
//     ];

//     let line_1 = 9// 第一行, 阳光显示 + 9个卡槽
//     let line_2 = 9// 列, 铲子 + 9个卡槽

//     return (<div style={{
//         display: 'flex',
//         flexDirection: "column",
//         backgroundColor: '#f0f0f0',
//         justifyContent: 'flex-start',
//         width: '100%',
//         height: "100%",
//         alignItems: "center",
//     }}>
//         {plants.map((plant, index) => (
//             <Card
//                 key={index}
//                 plantName={plant.name}
//                 cooldownTime={plant.cooldown}
//             />
//         ))}
//     </div>);
// }