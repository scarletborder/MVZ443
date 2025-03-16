// pokedex.tsx
import { useEffect, useState } from 'react';
import { useSaveManager } from '../../context/save_ctx';
import PlantFactoryMap from '../../game/presets/plant';
import GenericView from './genericView';
import { IRefPhaserGame } from '../../game/PhaserGame';
import { publicUrl } from '../../utils/browser';

interface Props {
    width: number;
    height?: number;
    onBack: () => void;
    sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
}

export default function Pokedex({ width, height, onBack }: Props) {
    if (height === undefined) {
        height = width * 3 / 4;
    }

    const [pokedexItems, setPokedexItems] = useState<Array<any>>([]);

    const saveManager = useSaveManager();
    const plants = saveManager.currentProgress.plants;

    useEffect(() => {
        let tmpList = plants
            .sort((a, b) => a.pid - b.pid)  // 先按pid排序
            .map((plant, i) => {
                const plantObj = PlantFactoryMap[plant.pid];
                return {
                    name: `${plantObj.name} LV.${plant.level}`,
                    details: plantObj.description(),
                    image: `${publicUrl}/assets/card/${plantObj.texture}.png`
                };
            });
        setPokedexItems(tmpList);
    }, [])

    console.log(plants)
    console.log(pokedexItems.length)

    return (
        <GenericView
            width={width}
            height={height}
            title="图鉴"
            items={pokedexItems}
            onBack={onBack}
        />
    );
}
