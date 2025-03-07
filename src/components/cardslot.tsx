import Card from './card';

export default function CardSlotHorizontal() {
    const plants = [
        { name: '向日葵', cooldown: 7 },
        { name: '豌豆射手', cooldown: 5 },
        { name: '坚果', cooldown: 10 },
        { name: '樱桃炸弹', cooldown: 15 },
        { name: '向日葵2', cooldown: 7 },
        { name: '豌豆射手2', cooldown: 5 },
        { name: '坚果2', cooldown: 10 },
        { name: '樱桃炸弹2', cooldown: 15 },
        { name: '向日葵', cooldown: 7 },
        { name: '豌豆射手', cooldown: 5 },
        { name: '坚果', cooldown: 10 },
        { name: '樱桃炸弹', cooldown: 15 },
    ];

    return (<div style={{
        display: 'flex',
        flexDirection: "row",
        backgroundColor: '#f0f0f0',
        justifyContent: 'flex-start',
        width: '100%',
        height: "100%",
        alignItems: "center",
    }}>
        {plants.map((plant, index) => (
            <Card
                key={index}
                plantName={plant.name}
                cooldownTime={plant.cooldown}
            />
        ))}
    </div>);
}