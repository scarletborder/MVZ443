import { translate } from "../../i18n";
import DepthUtils from "../../utils/depth";
import CombatManager from "../managers/CombatManager";
import { Game } from "../scenes/Game";

type PauseMenuShowOptions = {
  bluePrintMode?: boolean;
};

export class PauseMenu {
  private game: Game;
  private pauseText: Phaser.GameObjects.Text;
  private menuBackground: Phaser.GameObjects.Graphics;
  private menuContainer: Phaser.GameObjects.Container;
  private bluePrintPauseText: Phaser.GameObjects.Text;
  private isVisible: boolean = false;
  private isBluePrintMode: boolean = false;

  constructor(game: Game) {
    this.game = game;
    this.createMenu();
    this.createBluePrintPauseText();
  }

  private createMenu() {
    this.menuContainer = this.game.add.container(0, 0);
    this.menuContainer.setDepth(DepthUtils.getPauseMenuDepth());
    this.menuContainer.setVisible(false);

    const overlay = this.game.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, this.game.cameras.main.width, this.game.cameras.main.height);
    this.menuContainer.add(overlay);

    const centerX = this.game.cameras.main.width / 2;
    const startY = this.game.cameras.main.height * 0.15;
    const menuWidth = Math.min(this.game.scale.displaySize.width * 0.6, 400);
    const menuHeight = Math.min(this.game.scale.displaySize.height * 0.5, 300);

    const buttonFontSize = Math.min(this.game.scale.displaySize.width / 25, 24);
    const buttonPaddingY = 10;
    const continueButtonHeightH = buttonFontSize + buttonPaddingY * 2;
    const exitButtonHeightH = continueButtonHeightH;

    const continueButtonTopY = startY + menuHeight * 0.49;
    const continueToExitButtonGap = menuHeight * 0.06;
    const continueButtonBottomY = continueButtonTopY + continueButtonHeightH;
    const exitButtonTopY = continueButtonBottomY + continueToExitButtonGap;

    const pauseIconWidth = this.game.scale.displaySize.width / 40;
    const pauseIconHeight = pauseIconWidth * 1.4;
    const pauseIconToContinueButtonGap = menuHeight * 0.06;
    const pauseIconTopY = continueButtonTopY - pauseIconToContinueButtonGap - pauseIconHeight;

    this.menuBackground = this.game.add.graphics();
    this.menuBackground.fillStyle(0x2c3e50, 0.95);
    this.menuBackground.fillRoundedRect(
      centerX - menuWidth / 2,
      startY,
      menuWidth,
      menuHeight,
      20
    );

    this.menuBackground.lineStyle(4, 0xecf0f1, 1);
    this.menuBackground.strokeRoundedRect(
      centerX - menuWidth / 2,
      startY,
      menuWidth,
      menuHeight,
      20
    );

    this.menuBackground.fillGradientStyle(0xe74c3c, 0xc0392b, 0xe74c3c, 0xc0392b, 1);
    this.menuBackground.fillRoundedRect(
      centerX - menuWidth / 2 + 10,
      startY + 10,
      menuWidth - 20,
      8,
      4
    );

    this.menuContainer.add(this.menuBackground);

    this.pauseText = this.game.add.text(
      centerX,
      startY + menuHeight * 0.2,
      translate("game.paused"),
      {
        fontSize: `${Math.min(this.game.scale.displaySize.width / 18, 32)}px`,
        color: "#ecf0f1",
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        align: "center",
      }
    ).setOrigin(0.5);

    this.pauseText.setShadow(2, 2, "#2c3e50", 4);
    this.menuContainer.add(this.pauseText);

    this.createButton(
      centerX,
      continueButtonTopY + continueButtonHeightH / 2,
      translate("game.continue"),
      "#27ae60",
      "#2ecc71",
      buttonFontSize,
      buttonPaddingY,
      () => {
        CombatManager.Instance.isPaused = false;
      }
    );

    this.createButton(
      centerX,
      exitButtonTopY + exitButtonHeightH / 2,
      translate("game.exit"),
      "#e74c3c",
      "#c0392b",
      buttonFontSize,
      buttonPaddingY,
      () => {
        CombatManager.Instance.EndGame(false);
      }
    );

    this.addDecorativeElements(centerX, pauseIconTopY, pauseIconWidth, pauseIconHeight);
  }

  private createBluePrintPauseText() {
    this.bluePrintPauseText = this.game.add.text(
      this.game.cameras.main.width / 2,
      this.game.cameras.main.height * 0.18,
      translate("game.paused"),
      {
        fontSize: `${Math.min(this.game.scale.displaySize.width / 18, 30)}px`,
        color: "#f4f7fb",
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        align: "center",
      }
    ).setOrigin(0.5);

    this.bluePrintPauseText
      .setDepth(DepthUtils.getPauseMenuDepth())
      .setAlpha(0.45)
      .setVisible(false)
      .setShadow(2, 2, "#1f2937", 6);
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    normalColor: string,
    hoverColor: string,
    fontSize: number,
    paddingY: number,
    onClick: () => void
  ): Phaser.GameObjects.Text {
    const button = this.game.add.text(x, y, text, {
      fontSize: `${fontSize}px`,
      color: "#ffffff",
      fontFamily: "Arial, sans-serif",
      fontStyle: "bold",
      align: "center",
      backgroundColor: normalColor,
      padding: { x: 20, y: paddingY },
    }).setOrigin(0.5);

    button.setShadow(2, 2, "#2c3e50", 3);
    button.setInteractive({ useHandCursor: true });

    button.on("pointerover", () => {
      button.setStyle({ backgroundColor: hoverColor });
      button.setScale(1.05);
      this.game.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        ease: "Power2",
      });
    });

    button.on("pointerout", () => {
      button.setStyle({ backgroundColor: normalColor });
      this.game.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: "Power2",
      });
    });

    button.on("pointerdown", () => {
      button.setScale(0.95);
    });

    button.on("pointerup", () => {
      button.setScale(1.05);
      onClick();
    });

    this.menuContainer.add(button);
    return button;
  }

  private addDecorativeElements(
    centerX: number,
    pauseIconTopY: number,
    pauseIconWidth: number,
    pauseIconHeight: number
  ) {
    const pauseIcon = this.game.add.graphics();
    pauseIcon.fillStyle(0xecf0f1, 0.8);

    pauseIcon.fillRect(
      centerX - pauseIconWidth * 0.6,
      pauseIconTopY,
      pauseIconWidth * 0.3,
      pauseIconHeight
    );
    pauseIcon.fillRect(
      centerX + pauseIconWidth * 0.3,
      pauseIconTopY,
      pauseIconWidth * 0.3,
      pauseIconHeight
    );

    this.menuContainer.add(pauseIcon);

    this.game.tweens.add({
      targets: pauseIcon,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  public show(options: PauseMenuShowOptions = {}) {
    const { bluePrintMode = false } = options;

    this.isVisible = true;
    this.isBluePrintMode = bluePrintMode;

    this.menuContainer.setDepth(DepthUtils.getPauseMenuDepth());
    this.bluePrintPauseText.setDepth(DepthUtils.getPauseMenuDepth());

    if (bluePrintMode) {
      this.menuContainer.setVisible(false);
      this.bluePrintPauseText.setVisible(true);
      return;
    }

    this.bluePrintPauseText.setVisible(false);
    this.menuContainer.setVisible(true);
    this.menuContainer.setAlpha(1);
    this.menuContainer.setScale(1);
  }

  public hide() {
    this.bluePrintPauseText.setVisible(false);

    if (!this.isVisible) {
      return;
    }

    this.isVisible = false;
    this.isBluePrintMode = false;

    if (!this.menuContainer.visible) {
      return;
    }

    this.game.tweens.add({
      targets: this.menuContainer,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 200,
      ease: "Back.easeIn",
      onComplete: () => {
        this.menuContainer.setVisible(false);
        this.menuContainer.setAlpha(1);
        this.menuContainer.setScale(1);
      },
    });
  }

  public isBlockingInput(): boolean {
    return this.isVisible && !this.isBluePrintMode;
  }

  public destroy() {
    this.menuContainer?.destroy();
    this.bluePrintPauseText?.destroy();
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }
}

