import DepthUtils from "../../utils/depth";
import { Game } from "../scenes/Game";

export class PauseMenu {
  private game: Game;
  private pauseText: Phaser.GameObjects.Text;
  private menuBackground: Phaser.GameObjects.Graphics;
  private menuContainer: Phaser.GameObjects.Container;
  private isVisible: boolean = false;

  constructor(game: Game) {
    this.game = game;
    this.createMenu();
  }

  private createMenu() {
    // 创建容器来管理所有暂停菜单元素
    this.menuContainer = this.game.add.container(0, 0);
    this.menuContainer.setDepth(DepthUtils.getPauseMenuDepth());
    this.menuContainer.setVisible(false);


    // 创建半透明背景遮罩
    const overlay = this.game.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, this.game.cameras.main.width, this.game.cameras.main.height);
    this.menuContainer.add(overlay);

    // 计算菜单位置 - 从上往下15%开始
    const centerX = this.game.cameras.main.width / 2;
    const startY = this.game.cameras.main.height * 0.15;
    const menuWidth = Math.min(this.game.scale.displaySize.width * 0.6, 400);
    const menuHeight = Math.min(this.game.scale.displaySize.height * 0.5, 300);

    // 创建菜单背景 - 带圆角和渐变效果
    this.menuBackground = this.game.add.graphics();

    // 绘制带圆角的矩形背景
    this.menuBackground.fillStyle(0x2c3e50, 0.95);
    this.menuBackground.fillRoundedRect(
      centerX - menuWidth / 2,
      startY,
      menuWidth,
      menuHeight,
      20
    );

    // 添加边框
    this.menuBackground.lineStyle(4, 0xecf0f1, 1);
    this.menuBackground.strokeRoundedRect(
      centerX - menuWidth / 2,
      startY,
      menuWidth,
      menuHeight,
      20
    );

    // 添加装饰性渐变条
    this.menuBackground.fillGradientStyle(0xe74c3c, 0xc0392b, 0xe74c3c, 0xc0392b, 1);
    this.menuBackground.fillRoundedRect(
      centerX - menuWidth / 2 + 10,
      startY + 10,
      menuWidth - 20,
      8,
      4
    );

    this.menuContainer.add(this.menuBackground);

    // 创建"游戏已暂停"标题
    this.pauseText = this.game.add.text(
      centerX,
      startY + menuHeight * 0.2,
      '游戏已暂停',
      {
        fontSize: `${Math.min(this.game.scale.displaySize.width / 18, 32)}px`,
        color: '#ecf0f1',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        align: 'center'
      }
    ).setOrigin(0.5);

    // 添加文字阴影效果
    this.pauseText.setShadow(2, 2, '#2c3e50', 4);
    this.menuContainer.add(this.pauseText);

    // 创建继续游戏按钮
    this.createButton(
      centerX,
      startY + menuHeight * 0.45,
      '继续游戏',
      '#27ae60',
      '#2ecc71',
      () => {
        this.game.handlePause({ paused: false });
      }
    );

    // 创建退出游戏按钮
    this.createButton(
      centerX,
      startY + menuHeight * 0.7,
      '退出游戏',
      '#e74c3c',
      '#c0392b',
      () => {
        this.game.handleExit(false);
      }
    );

    // 添加一个装饰性图标或动画（可选）
    this.addDecorativeElements(centerX, startY + menuHeight * 0.32);
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    normalColor: string,
    hoverColor: string,
    onClick: () => void
  ): Phaser.GameObjects.Text {
    const button = this.game.add.text(x, y, text, {
      fontSize: `${Math.min(this.game.scale.displaySize.width / 25, 24)}px`,
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      backgroundColor: normalColor,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    // 添加按钮样式
    button.setShadow(2, 2, '#2c3e50', 3);

    // 设置交互效果
    button.setInteractive({ useHandCursor: true });

    // 鼠标悬停效果
    button.on('pointerover', () => {
      button.setStyle({ backgroundColor: hoverColor });
      button.setScale(1.05);
      this.game.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        ease: 'Power2'
      });
    });

    button.on('pointerout', () => {
      button.setStyle({ backgroundColor: normalColor });
      this.game.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Power2'
      });
    });

    // 点击效果
    button.on('pointerdown', () => {
      button.setScale(0.95);
    });

    button.on('pointerup', () => {
      button.setScale(1.05);
      onClick();
    });

    this.menuContainer.add(button);
    return button;
  }

  private addDecorativeElements(centerX: number, centerY: number) {
    // 添加暂停图标（两个竖线）
    const pauseIcon = this.game.add.graphics();
    pauseIcon.fillStyle(0xecf0f1, 0.8);

    const iconSize = Math.min(this.game.scale.displaySize.width / 40, 20);
    // 左竖线
    pauseIcon.fillRect(centerX - iconSize * 0.6, centerY - iconSize * 0.5, iconSize * 0.3, iconSize);
    // 右竖线
    pauseIcon.fillRect(centerX + iconSize * 0.3, centerY - iconSize * 0.5, iconSize * 0.3, iconSize);

    this.menuContainer.add(pauseIcon);

    // 添加呼吸动画效果
    this.game.tweens.add({
      targets: pauseIcon,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  public show() {
    // 强制设置一个极高的深度，确保在所有其他元素之上
    this.menuContainer.setDepth(DepthUtils.getPauseMenuDepth());
    if (!this.isVisible) {
      this.isVisible = true;
      this.menuContainer.setVisible(true);
      this.menuContainer.setAlpha(1);
      this.menuContainer.setScale(1);
    }
  }

  public hide() {
    if (this.isVisible) {
      this.isVisible = false;

      // 添加退场动画
      this.game.tweens.add({
        targets: this.menuContainer,
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 200,
        ease: 'Back.easeIn',
        onComplete: () => {
          this.menuContainer.setVisible(false);
        }
      });
    }
  }

  public destroy() {
    // 销毁所有相关对象
    if (this.menuContainer) {
      this.menuContainer.destroy();
    }
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }
}
