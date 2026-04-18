import ResourceManager from "../../managers/combat/ResourceManager";

namespace ResourceCmd {
  export function AddEnergyToAll(amount: number) {
    ResourceManager.Instance.UpdateEnergy(amount, 'all');
  }

  export function AddStarshardToAll(amount: number) {
    ResourceManager.Instance.UpdateStarShards(amount, 'all');
  }
}

export default ResourceCmd;