import Phaser from 'phaser';
import { gameplayConfig } from './gameplayConfig';

export class PlayerHead {
  private readonly container: Phaser.GameObjects.Container;
  private readonly mouth: Phaser.GameObjects.Arc;
  private readonly face: Phaser.GameObjects.Arc;
  private speedBoostRemainingMs = 0;
  private boostEffectTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.face = scene.add.circle(0, 0, gameplayConfig.head.radius, 0xfbbf24);
    const leftEye = scene.add.circle(-14, -12, 5, 0x111827);
    const rightEye = scene.add.circle(14, -12, 5, 0x111827);
    this.mouth = scene.add.circle(0, 18, gameplayConfig.mouth.radius, 0x7f1d1d).setScale(1.25, 0.72);

    this.container = scene.add.container(x, y, [this.face, leftEye, rightEye, this.mouth]);
  }

  get mouthX(): number {
    return this.container.x + this.mouth.x;
  }

  get mouthY(): number {
    return this.container.y + this.mouth.y;
  }

  move(dx: number, dy: number, seconds: number): void {
    const isBoosted = this.speedBoostRemainingMs > 0;
    const speed = gameplayConfig.head.speed * (isBoosted ? gameplayConfig.head.catchSpeedMultiplier : 1);
    this.speedBoostRemainingMs = Math.max(0, this.speedBoostRemainingMs - seconds * 1000);
    this.updateBoostEffect(isBoosted, seconds);

    if (dx === 0 && dy === 0) return;

    const length = Math.hypot(dx, dy);
    this.container.x += (dx / length) * speed * seconds;
    this.container.y += (dy / length) * speed * seconds;
  }

  boostSpeed(): void {
    this.speedBoostRemainingMs = gameplayConfig.head.catchSpeedDurationMs;
    this.boostEffectTime = 0;
    this.updateBoostEffect(true, 0);
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
    this.speedBoostRemainingMs = 0;
    this.updateBoostEffect(false, 0);
  }

  private updateBoostEffect(isBoosted: boolean, seconds: number): void {
    if (!isBoosted) {
      this.face.setFillStyle(0xfbbf24);
      this.container.setScale(1);
      return;
    }

    this.boostEffectTime += seconds;
    const pulse = (Math.sin(this.boostEffectTime * 30) + 1) / 2;
    this.face.setFillStyle(0xff6b35);
    this.container.setScale(1 + pulse * 0.12);
  }
}
