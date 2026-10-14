import Phaser from 'phaser';
import { gameplayConfig } from './gameplayConfig';

export class Popcorn {
  private readonly container: Phaser.GameObjects.Container;
  private readonly velocity = new Phaser.Math.Vector2(0, 0);

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

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setVelocity(x: number, y: number): void {
    this.velocity.set(x, y);
  }

  move(seconds: number): void {
    this.velocity.y += gameplayConfig.popcorn.gravity * seconds;
    this.container.x += this.velocity.x * seconds;
    this.container.y += this.velocity.y * seconds;
    this.container.rotation += gameplayConfig.popcorn.rotationSpeed * seconds;
  }

  isOutOfBounds(width: number, height: number): boolean {
    const missPadding = gameplayConfig.popcorn.radius * gameplayConfig.popcorn.missBoundsMultiplier;
    const fellBelowScreen = this.y > height + gameplayConfig.popcorn.radius;
    const flewPastTop = this.y < -missPadding;
    const flewPastLeft = this.x < -missPadding;
    const flewPastRight = this.x > width + missPadding;

    return fellBelowScreen || flewPastTop || flewPastLeft || flewPastRight;
  }
}
