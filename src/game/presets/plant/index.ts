// plants/index.ts
import { IRecord } from "../../models/IRecord";
import ATDispenserRecord from "./at_dispenser";
import DispenserRecord from "./dispenser";
import FurnaceRecord from "./furnace";
import GeneratorRecord from "./generator";
import IceBombRecord from "./ice_bomb";
import Lily from "./lily";
import MagicPowderRecord from "./magic_powder";
import ObsidianRecord from "./obsidian";
import PumpkinRecord from "./pumkin";
import PumpkinWanRecord from "./pumkin_wan";
import SmallDispenserRecord from "./small_dispenser";
import TntRecord from "./tnt";
import TntMines from "./tnt_mines";
import TripleDispenserRecord from "./triple_dispenser";

const PlantFactoryMap: Record<number, IRecord> = {
    1: DispenserRecord,
    2: FurnaceRecord,
    3: ObsidianRecord,
    4: TntMines,
    5: SmallDispenserRecord,
    6: Lily,
    7: TntRecord,
    8: GeneratorRecord,
    9: PumpkinRecord,
    10: MagicPowderRecord,
    11: PumpkinWanRecord,
    12: IceBombRecord,
    13: TripleDispenserRecord,
    14: ATDispenserRecord,
}

export default PlantFactoryMap;