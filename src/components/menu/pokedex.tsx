// pokedex.tsx
import { useEffect, useState } from 'react';
import { useSaveManager } from '../../context/save_ctx';
import { PlantFactoryMap } from '../../game/utils/loader';
import GenericView from './genericView';
import { IRefPhaserGame } from '../../game/PhaserGame';
import { Game } from '../../game/scenes/Game';

interface Props {
    width: number;
    height?: number;
    onBack: () => void;
    sceneRef: React.MutableRefObject<IRefPhaserGame | null>;
}

export default function Pokedex({ width, height, onBack, sceneRef }: Props) {
    if (height === undefined) {
        height = width * 3 / 4;
    }

    const [pokedexItems, setPokedexItems] = useState<Array<any>>([]);

    const saveManager = useSaveManager();
    const plants = saveManager.currentProgress.plants;

    useEffect(() => {
        let tmpList = Array.from(plants, (plant, i) => {
            const plantObj = PlantFactoryMap[plant.pid];
            let image = "";

            if (sceneRef.current) {
                const scene = sceneRef.current.scene as Game;
                if (scene && scene.scene.key === 'Game') {
                    image = scene.textures.getBase64(plantObj.texture);
                }
            }

            return {
                name: plantObj.name,
                details: plantObj.description,
                image: `/public/assets/${plantObj.texture}.png`
            };
        });
        setPokedexItems(tmpList);
    }, [sceneRef.current]);


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
