import { debounce } from "../../utils/debounce";
import DepthUtils from "../../utils/depth";
import { HasConnected } from "../../utils/net/sync";
import { PhaserEventBus, PhaserEvents } from "../EventBus";
import CombatManager from "../managers/CombatManager";
import { Game } from "../scenes/Game";
import { PauseMenu } from "./PauseMenu";

type InGameButtonState = {
  text: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  shadowColor: string;
  alpha: number;
  scale: number;
};

const applyButtonState = (
  button: Phaser.GameObjects.Text,
  fontSize: number,
  paddingX: number,
  paddingY: number,
  state: InGameButtonState
) => {
  button.setText(state.text);
  button.setStyle({
    fontSize: `${fontSize}px`,
    color: state.color,
    fontFamily: "Arial, sans-serif",
    fontStyle: "bold",
    backgroundColor: state.backgroundColor,
    stroke: state.borderColor,
    strokeThickness: 2,
    padding: { x: paddingX, y: paddingY },
  });
  button.setShadow(2, 2, state.shadowColor, 6);
  button.setAlpha(state.alpha);
  button.setScale(state.scale);
};

const setButtonInteractive = (button: Phaser.GameObjects.Text, enabled: boolean) => {
  if (!button.input) {
    button.setInteractive({ useHandCursor: true });
  }

  if (button.input) {
    button.input.enabled = enabled;
  }
};

export default function CreateInnerMenu(game: Game) {
  const pauseMenu = new PauseMenu(game);
  (game as any).pauseMenu = pauseMenu;

  const pauseFontSize = Math.min(game.scale.displaySize.width / 30, 24);
  const speedFontSize = Math.min(game.scale.displaySize.width / 24, 28);
  const pausePaddingX = 14;
  const pausePaddingY = 8;
  const speedPaddingX = 16;
  const speedPaddingY = 8;

  game.pauseBtn = game.add.text(
    game.cameras.main.width - 10,
    game.cameras.main.height - 10,
    "暂停",
    {}
  ).setOrigin(1, 1).setDepth(DepthUtils.getMenuDepth()).setInteractive({ useHandCursor: true });

  game.speedText = game.add.text(
    game.cameras.main.width - 10,
    12,
    "1速",
    {}
  ).setOrigin(1, 0).setVisible(true).setDepth(DepthUtils.getMenuDepth()).setInteractive({ useHandCursor: true });

  let pauseHovered = false;
  let speedHovered = false;

  const buildPauseButtonState = (): InGameButtonState => {
    const isDisabled = pauseMenu.isBlockingInput();
    if (isDisabled) {
      return {
        text: "暂停",
        color: "#d6dee8",
        backgroundColor: "#51606f",
        borderColor: "#aab7c4",
        shadowColor: "#1c2530",
        alpha: 0.5,
        scale: 1,
      };
    }

    return {
      text: "暂停",
      color: "#f8fbff",
      backgroundColor: pauseHovered ? "#52687f" : "#3f5164",
      borderColor: "#d5deea",
      shadowColor: "#18212b",
      alpha: 0.96,
      scale: pauseHovered ? 1.04 : 1,
    };
  };

  const buildSpeedButtonState = (): InGameButtonState => {
    const isPaused = CombatManager.Instance.isPaused;
    const isDoubleSpeed = game.time.timeScale > 1;
    const speedLabel = isDoubleSpeed ? "2速" : "1速";

    if (isPaused) {
      return {
        text: speedLabel,
        color: "#e3e8ef",
        backgroundColor: "#5f6974",
        borderColor: "#b8c1cb",
        shadowColor: "#1f2933",
        alpha: 0.45,
        scale: 1,
      };
    }

    if (isDoubleSpeed) {
      return {
        text: speedLabel,
        color: "#fff9ef",
        backgroundColor: speedHovered ? "#d57a2e" : "#b85c16",
        borderColor: "#ffd393",
        shadowColor: "#5c2e0a",
        alpha: 0.98,
        scale: speedHovered ? 1.06 : 1,
      };
    }

    return {
      text: speedLabel,
      color: "#f1fbff",
      backgroundColor: speedHovered ? "#2d9ab2" : "#237d95",
      borderColor: "#a9edf5",
      shadowColor: "#0f3540",
      alpha: 0.96,
      scale: speedHovered ? 1.04 : 1,
    };
  };

  const refreshButtons = () => {
    const isSpeedEnabled = !CombatManager.Instance.isPaused && !HasConnected();
    const isPauseEnabled = !pauseMenu.isBlockingInput() && !HasConnected();

    applyButtonState(game.pauseBtn, pauseFontSize, pausePaddingX, pausePaddingY, buildPauseButtonState());
    applyButtonState(game.speedText, speedFontSize, speedPaddingX, speedPaddingY, buildSpeedButtonState());

    setButtonInteractive(game.pauseBtn, isPauseEnabled);
    setButtonInteractive(game.speedText, isSpeedEnabled);
  };

  (game as any).refreshInnerMenuButtons = refreshButtons;

  game.pauseBtn.on("pointerover", () => {
    pauseHovered = true;
    refreshButtons();
  });

  game.pauseBtn.on("pointerout", () => {
    pauseHovered = false;
    refreshButtons();
  });

  game.pauseBtn.on("pointerdown", () => {
    if (game.pauseBtn.input?.enabled) {
      game.pauseBtn.setScale(0.96);
    }
  });

  game.pauseBtn.on("pointerup", () => {
    debounce(() => {
      if (!game.pauseBtn.input?.enabled) {
        refreshButtons();
        return;
      }

      if (HasConnected()) {
        refreshButtons();
        return;
      }

      PhaserEventBus.emit(PhaserEvents.TogglePause);
      refreshButtons();
    }, 100)();
  }, game);

  game.speedText.on("pointerover", () => {
    speedHovered = true;
    refreshButtons();
  });

  game.speedText.on("pointerout", () => {
    speedHovered = false;
    refreshButtons();
  });

  game.speedText.on("pointerdown", () => {
    if (game.speedText.input?.enabled) {
      game.speedText.setScale(0.96);
    }
  });

  const playSpeedToggleEffect = () => {
    game.tweens.add({
      targets: game.speedText,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 120,
      yoyo: true,
      ease: "Back.Out",
      onComplete: () => {
        refreshButtons();
      },
    });
  };

  const tryToggleSpeed = () => {
    if (!game.speedText.input?.enabled) {
      refreshButtons();
      return false;
    }

    PhaserEventBus.emit(PhaserEvents.TimespeedToggle);
    return true;
  };

  game.speedText.on("pointerup", () => {
    tryToggleSpeed();
  });

  CombatManager.Instance.Eventbus.on("onCombatPause", refreshButtons);
  CombatManager.Instance.Eventbus.on("onCombatResume", refreshButtons);

  const onTimespeedChanged = () => {
    refreshButtons();
    playSpeedToggleEffect();
  };
  PhaserEventBus.on(PhaserEvents.TimespeedChanged, onTimespeedChanged);

  game.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    CombatManager.Instance.Eventbus.off("onCombatPause", refreshButtons);
    CombatManager.Instance.Eventbus.off("onCombatResume", refreshButtons);
    PhaserEventBus.off(PhaserEvents.TimespeedChanged, onTimespeedChanged);
  });

  refreshButtons();
}
