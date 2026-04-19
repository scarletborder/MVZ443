import { MonsterLibrary } from "./MonsterLibrary";
import { ObstacleLibrary } from "./ObstacleLibrary";
import { PlantLibrary } from "./PlantLibrary";

declare global {
  interface Window {
    __mvz443LibrariesInitialized__?: boolean;
  }
}

export function initializeGameLibraries() {
  if (window.__mvz443LibrariesInitialized__) {
    return;
  }

  PlantLibrary.Initialize();
  MonsterLibrary.Initialize();
  ObstacleLibrary.Initialize();

  window.__mvz443LibrariesInitialized__ = true;
}
