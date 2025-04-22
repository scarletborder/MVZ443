// plants/index.ts
import { IRecord } from "../../models/IRecord";
import ATDispenserRecord from "./chapter1/at_dispenser";
import DispenserRecord from "./chapter1/dispenser";
import FurnaceRecord from "./chapter1/furnace";
import GeneratorRecord from "./chapter1/generator";
import IceBombRecord from "./chapter1/ice_bomb";
import Lily from "./chapter1/lily";
import MagicPowderRecord from "./chapter1/magic_powder";
import ObsidianRecord from "./chapter1/obsidian";
import PumpkinRecord from "./chapter1/pumkin";
import PumpkinWanRecord from "./chapter1/pumkin_wan";
import SmallDispenserRecord from "./chapter1/small_dispenser";
import TntRecord from "./chapter1/tnt";
import TntMines from "./chapter1/tnt_mines";
import TripleDispenserRecord from "./chapter1/triple_dispenser";
import DoubleDispenser_Record from "./chapter2/double_dispenser";
import ElasticPutinRecord from "./chapter2/elastic_putin";

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
    15: ElasticPutinRecord,
    16: DoubleDispenser_Record,
}

export default PlantFactoryMap;