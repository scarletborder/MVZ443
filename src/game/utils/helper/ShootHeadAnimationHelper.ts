import type { Game } from "../../scenes/Game";

export type ShootHeadBurstCallback = () => void;

export default class ShootHeadAnimationHelper {
  public static playRecoil(
    scene: Game,
    head: Phaser.GameObjects.Components.Transform,
    restX: number,
    moveDistance: number,
    onBurst?: ShootHeadBurstCallback,
  ): void {
    this.stopAndReset(scene, head, restX);

    scene.tweens.add({
      targets: head,
      x: restX - moveDistance,
      duration: 200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        onBurst?.();

        scene.tweens.add({
          targets: head,
          x: restX,
          duration: 200,
          ease: 'Sine.easeIn',
          onComplete: () => {
            head.x = restX;
          }
        });
      }
    });
  }

  public static startHoldRecoil(
    scene: Game,
    head: Phaser.GameObjects.Components.Transform,
    restX: number,
    moveDistance: number,
  ): void {
    this.stopAndReset(scene, head, restX);

    scene.tweens.add({
      targets: head,
      x: restX - moveDistance,
      duration: 200,
      ease: 'Sine.easeOut'
    });
  }

  public static recover(
    scene: Game,
    head: Phaser.GameObjects.Components.Transform,
    restX: number,
  ): void {
    scene.tweens.killTweensOf(head);

    scene.tweens.add({
      targets: head,
      x: restX,
      duration: 200,
      ease: 'Sine.easeIn',
      onComplete: () => {
        head.x = restX;
      }
    });
  }

  public static stopAndReset(
    scene: Game,
    head: Phaser.GameObjects.Components.Transform,
    restX: number,
  ): void {
    scene.tweens.killTweensOf(head);
    head.x = restX;
  }
}
