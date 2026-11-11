import Phaser from 'phaser';
import { gameplayConfig } from './gameplayConfig';

export class Popcorn {
  private readonly container: Phaser.GameObjects.Container;
  private readonly velocity = new Phaser.Math.Vector2(0, 0);
  private keepInsideScreen = false;
  private landed = false;

  constructor(scene: Phaser.Scene) {
    const shadow = scene.add.circle(2, 3, gameplayConfig.popcorn.radius, 0xd97706, 0.35);
    const kernel = scene.add.circle(0, 0, gameplayConfig.popcorn.radius, 0xfff7ad);
    const bumpA = scene.add.circle(-6, -7, 7, 0xffffff);
    const bumpB = scene.add.circle(7, -5, 6, 0xfffbeb);
    const bumpC = scene.add.circle(1, 7, 7, 0xfde68a);

    this.container = scene.add.container(0, 0, [shadow, kernel, bumpA, bumpB, bumpC]);
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  get velocityX(): number {
    return this.velocity.x;
  }

  get velocityY(): number {
    return this.velocity.y;
  }

  setPosition(x: number, y: number, keepInsideScreen = false): void {
    this.container.setPosition(x, y);
    this.keepInsideScreen = keepInsideScreen;
    this.landed = false;
  }

  setVelocity(x: number, y: number): void {
    this.velocity.set(x, y);
  }

  setVisible(isVisible: boolean): void {
    this.container.setVisible(isVisible);
  }

  bounceBack(horizontalSpeed: number, verticalSpeed: number): void {
    this.velocity.x = horizontalSpeed;
    this.velocity.y = verticalSpeed;
    this.keepInsideScreen = true;
    this.landed = false;
  }

  move(seconds: number, width: number, height: number): void {
    if (this.landed) return;

    this.velocity.y += gameplayConfig.popcorn.gravity * seconds;
    const nextX = this.container.x + this.velocity.x * seconds;
    const nextY = this.container.y + this.velocity.y * seconds;
    this.container.x = this.keepInsideScreen
      ? Phaser.Math.Clamp(nextX, gameplayConfig.popcorn.radius, width - gameplayConfig.popcorn.radius)
      : nextX;
    this.container.y = this.keepInsideScreen
      ? Math.min(nextY, height - gameplayConfig.popcorn.radius)
      : nextY;
    if (this.keepInsideScreen && nextY >= height - gameplayConfig.popcorn.radius) {
      this.landed = true;
      this.velocity.set(0, 0);
    }
    this.container.rotation += gameplayConfig.popcorn.rotationSpeed * seconds;
  }

  isOutOfBounds(width: number, height: number): boolean {
    const missPadding = gameplayConfig.popcorn.radius * gameplayConfig.popcorn.missBoundsMultiplier;
    const fellBelowScreen = this.keepInsideScreen
      ? this.landed
      : this.y > height + gameplayConfig.popcorn.radius;
    const flewPastTop = this.y < -missPadding;
    const flewPastLeft = this.x < -missPadding;
    const flewPastRight = this.x > width + missPadding;

    return fellBelowScreen || flewPastTop || flewPastLeft || flewPastRight;
  }
}
