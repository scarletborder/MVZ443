import { Game } from "../scenes/Game";

interface IProjectile {
    scene: Game;

    playSound(): void;
}

export default IProjectile;