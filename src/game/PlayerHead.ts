import Phaser from 'phaser';
import { gameplayConfig } from './gameplayConfig';

export class PlayerHead {
  private readonly container: Phaser.GameObjects.Container;
  private readonly mouth: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const face = scene.add.circle(0, 0, gameplayConfig.head.radius, 0xfbbf24);
    const leftEye = scene.add.circle(-14, -12, 5, 0x111827);
    const rightEye = scene.add.circle(14, -12, 5, 0x111827);
    this.mouth = scene.add.circle(0, 18, gameplayConfig.mouth.radius, 0x7f1d1d).setScale(1.25, 0.72);

    this.container = scene.add.container(x, y, [face, leftEye, rightEye, this.mouth]);
  }

  get mouthX(): number {
    return this.container.x + this.mouth.x;
  }

  get mouthY(): number {
    return this.container.y + this.mouth.y;
  }

  move(dx: number, dy: number, seconds: number): void {
    if (dx === 0 && dy === 0) return;

    const length = Math.hypot(dx, dy);
    this.container.x += (dx / length) * gameplayConfig.head.speed * seconds;
    this.container.y += (dy / length) * gameplayConfig.head.speed * seconds;
  }

  keepOnScreen(width: number, height: number): void {
    this.container.x = Phaser.Math.Clamp(
      this.container.x,
      gameplayConfig.head.radius,
      width - gameplayConfig.head.radius,
    );
    this.container.y = Phaser.Math.Clamp(
      this.container.y,
      gameplayConfig.layout.topPadding + gameplayConfig.head.radius,
      height - gameplayConfig.head.radius,
    );
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }
}
