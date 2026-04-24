import { Chalk } from "chalk";
import { FrameInterval } from "../../../public/constants";
import BackendWS from "../../utils/net/sync";
import { onlineStateManager } from "../../store/OnlineStateManager";
import CardpileManager from "../managers/combat/CardpileManager";
import MobManager from "../managers/combat/MobManager";
import ResourceManager from "../managers/combat/ResourceManager";
import { MonsterLibrary } from "../managers/library/MonsterLibrary";
import { PositionManager } from "../managers/view/PositionManager";
import type { Game } from "../scenes/Game";

export type ConsoleResourceKind = "energy" | "starshards" | "starShards" | "star" | "stars" | "星之碎片" | "星碎" | "能量";

type CardInfo = {
  slot: number;
  pid: number;
  level: number;
  leftMs: number;
  leftFrame: number;
  previewLeftMs: number;
  previewLeftFrame: number;
  displayLeftMs: number;
  displayLeftFrame: number;
  totalMs: number;
  totalFrame: number;
  hasReloaded: boolean;
};

export type DebugConsoleCommands = {
  spawnMonster: (mid: number, row?: number, col?: number, carryStarShards?: boolean) => unknown;
  spawn: (mid: number, row?: number, col?: number, carryStarShards?: boolean) => unknown;
  addResource: (kind: ConsoleResourceKind, amount: number) => unknown;
  add: (kind: ConsoleResourceKind, amount: number) => unknown;
  reloadCard: (slot: number) => unknown;
  cooldownCard: (slot: number) => unknown;
  cards: () => CardInfo[] | null;
  cardInfo: () => CardInfo[] | null;
  help: () => void;
};

type ConsoleWindow = Window & typeof globalThis & {
  DBGCMD?: DebugConsoleCommands;
};

const chalk = new Chalk({ level: 3 });
const badge = chalk.hex("#151018").bgHex("#ffd166").bold(" DBGCMD ");
const ok = chalk.hex("#052e1a").bgHex("#7ee787").bold;
const warn = chalk.hex("#fff7ed").bgHex("#f97316").bold;
const infoLabel = chalk.hex("#e0f2fe").bgHex("#2563eb").bold;
const command = chalk.hex("#dbeafe").bgHex("#111827");

namespace ConsoleCmd {
  let currentScene: Game | null = null;

  export function install(scene: Game) {
    currentScene = scene;
    const commands = createCommands();
    (window as ConsoleWindow).DBGCMD = commands;
    printBanner();
    return commands;
  }

  export function uninstall(scene?: Game) {
    if (!scene || currentScene === scene) {
      currentScene = null;
      delete (window as ConsoleWindow).DBGCMD;
    }
  }

  function createCommands(): DebugConsoleCommands {
    return {
      spawnMonster,
      spawn: spawnMonster,
      addResource,
      add: addResource,
      reloadCard,
      cooldownCard: cooldownCard,
      cards: printCardInfo,
      cardInfo: printCardInfo,
      help: printHelp,
    };
  }

  function spawnMonster(mid: number, row = 0, col = PositionManager.Instance.Col_Number + 1, carryStarShards = false) {
    if (!ensureLocalSinglePlayer()) return null;
    if (!currentScene) return printBlocked("Game scene is not ready.");

    const normalizedMid = Math.floor(Number(mid));
    const normalizedRow = Math.floor(Number(row));
    const normalizedCol = Math.floor(Number(col));
    const model = MonsterLibrary.GetModel(normalizedMid);
    if (!model) return printBlocked(`Monster mid=${normalizedMid} does not exist.`);

    return spawnByCmd(normalizedMid, normalizedCol, normalizedRow, carryStarShards);
  }

  function spawnByCmd(mid: number, col: number, row: number, carryStarShards: boolean) {
    if (!currentScene) return null;
    const model = MonsterLibrary.GetModel(mid);
    if (!model) return null;

    const finalRow = Phaser.Math.Clamp(row, 0, PositionManager.Instance.Row_Number - 1);
    const entity = model.createEntity(currentScene, col, finalRow, -9999);
    MobManager.Instance.registerMonster(entity);
    entity.addDestroyListener((monster) => MobManager.Instance.registerDestroy(monster));
    if (carryStarShards) {
      if (!model.couldCarryStarShards) {
        printBlocked(`Monster mid=${mid} cannot carry star shards.`);
      } else {
        entity.addStarShards();
      }
    }
    printOk(`Spawned monster mid=${mid}, row=${finalRow}, col=${col}, starShards=${carryStarShards}.`);
    return entity;
  }

  function addResource(kind: ConsoleResourceKind, amount: number) {
    if (!ensureLocalSinglePlayer()) return null;
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount)) return printBlocked(`Invalid amount: ${amount}`);

    const normalizedKind = normalizeResourceKind(kind);
    if (normalizedKind === "energy") {
      ResourceManager.Instance.UpdateEnergy(normalizedAmount, "all");
      printOk(`Added ${normalizedAmount} energy to all players.`);
      return ResourceManager.Instance.getEnergy("mine");
    }
    if (normalizedKind === "starshards") {
      ResourceManager.Instance.UpdateStarShards(normalizedAmount, "all");
      printOk(`Added ${normalizedAmount} star shards to all players.`);
      return ResourceManager.Instance.getStarShards("mine");
    }
    return printBlocked(`Unknown resource kind: ${kind}`);
  }

  function reloadCard(slot: number) {
    if (!ensureLocalSinglePlayer()) return null;
    const info = getCardInfo();
    const card = info[Math.floor(Number(slot))];
    if (!card) return printBlocked(`Card slot ${slot} does not exist.`);

    CardpileManager.Instance.reloadCard(card.pid);
    printOk(`Reloaded card slot=${card.slot}, pid=${card.pid}, level=${card.level}.`);
    return getCardInfo()[card.slot];
  }

  function cooldownCard(slot: number) {
    if (!ensureLocalSinglePlayer()) return null;
    const info = getCardInfo();
    const card = info[Math.floor(Number(slot))];
    if (!card) return printBlocked(`Card slot ${slot} does not exist.`);

    CardpileManager.Instance.cooldownCard(card.pid);
    printOk(`Cooldown card slot=${card.slot}, pid=${card.pid}, level=${card.level}.`);
    return getCardInfo()[card.slot];
  }

  function printCardInfo() {
    if (!ensureLocalSinglePlayer()) return null;
    const info = getCardInfo();
    console.log(`${badge} ${infoLabel(" Card Slots ")}`);
    console.table(info);
    return info;
  }

  function getCardInfo(): CardInfo[] {
    return [...CardpileManager.Instance.cardpileStatus.entries()].map(([pid, status], slot) => {
      const leftMs = Math.max(0, status.leftMs);
      const previewLeftMs = Math.max(0, status.previewLeftMs);
      const displayLeftMs = Math.max(leftMs, previewLeftMs);
      return {
        slot,
        pid,
        level: status.level,
        leftMs,
        leftFrame: msToFrame(leftMs),
        previewLeftMs,
        previewLeftFrame: msToFrame(previewLeftMs),
        displayLeftMs,
        displayLeftFrame: msToFrame(displayLeftMs),
        totalMs: status.totalMs,
        totalFrame: msToFrame(status.totalMs),
        hasReloaded: displayLeftMs <= 0,
      };
    });
  }

  function normalizeResourceKind(kind: ConsoleResourceKind) {
    const value = String(kind).trim().toLowerCase();
    if (["energy", "能量"].includes(value)) return "energy";
    if (["starshards", "starshard", "star", "stars", "星之碎片", "星碎"].includes(value)) return "starshards";
    return null;
  }

  function ensureLocalSinglePlayer() {
    const roomAllReady = onlineStateManager.getRoomAllReady();
    const playerCount = roomAllReady?.allPlayerCount ?? onlineStateManager.getPlayerCount();
    const isSinglePlayer = playerCount <= 1;
    const isLocalSinglePlayer = isSinglePlayer && (!BackendWS.isOnlineMode() || BackendWS.isMockRoomMode());

    if (!isLocalSinglePlayer) {
      const mode = BackendWS.isMockRoomMode() ? "mock" : BackendWS.isOnlineMode() ? "online" : "local";
      printBlocked(`DBGCMD is only available in local single-player games. current mode=${mode}, players=${playerCount}`);
      return false;
    }
    return true;
  }

  function printBanner() {
    console.log(`${badge} ${ok(" Ready ")} ${warn(" Local single-player only ")}`);
    printHelp();
  }

  function printHelp() {
    console.log(`${badge} ${infoLabel(" Commands ")}`);
    console.log(`${command(" DBGCMD.spawnMonster(mid, row = 0, col = MaxCol + 1, carryStarShards = false) ")} 生成怪物`);
    console.log(`${command(" DBGCMD.addResource('energy' | 'starshards', amount) ")} 为 all 玩家增加资源`);
    console.log(`${command(" DBGCMD.reloadCard(slot) ")} 冷却指定卡槽，slot 从 0 开始`);
    console.log(`${command(" DBGCMD.cards() ")} 查看卡槽 pid / level / 冷却 ms 和 frame`);
  }

  function printOk(message: string) {
    console.log(`${badge} ${ok(` ${message} `)}`);
    return true;
  }

  function printBlocked(message: string) {
    console.warn(`${badge} ${warn(` ${message} `)}`);
    return null;
  }

  function msToFrame(ms: number) {
    return Math.ceil(ms / FrameInterval);
  }
}

export default ConsoleCmd;

