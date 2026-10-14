import Phaser from 'phaser';

const HEAD_SPEED = 320;
const HEAD_RADIUS = 42;
const MOUTH_RADIUS = 22;
const POPCORN_RADIUS = 12;
const POPCORN_GRAVITY = 520;
const POPCORN_MIN_SPEED_X = 150;
const POPCORN_MAX_SPEED_X = 260;
const POPCORN_MIN_SPEED_Y = -360;
const POPCORN_MAX_SPEED_Y = -240;
const GAME_TOP_PADDING = 104;

/**
 * Простая игра: двигаем голову и ловим летящий попкорн ртом.
 */
export class GameScene extends Phaser.Scene {
  private head!: Phaser.GameObjects.Container;
  private mouth!: Phaser.GameObjects.Arc;
  private popcorn!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private scoreText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private score = 0;
  private popcornVelocity = new Phaser.Math.Vector2(0, 0);
  private isGameOver = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 24, 'ПОПКОРН В РОТ', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);

    this.add
      .text(width / 2, 62, 'Стрелки / WASD — двигай голову. Пропустил попкорн — игра окончена.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5, 0);

    this.createPlayerHead(width / 2, height * 0.68);
    this.createPopcorn();

    this.scoreText = this.add.text(24, height - 48, 'Счёт: 0', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
    });

    this.messageText = this.add
      .text(width / 2, height / 2, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    if (!this.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointerdown', () => {
      if (this.isGameOver) this.restartGame();
    });

    this.launchPopcorn();
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) this.restartGame();
      return;
    }

    const seconds = delta / 1000;
    this.moveHead(seconds);
    this.movePopcorn(seconds);
    this.checkPopcornCatch();
    this.checkPopcornMiss();
  }

  private createPlayerHead(x: number, y: number): void {
    const face = this.add.circle(0, 0, HEAD_RADIUS, 0xfbbf24);
    const leftEye = this.add.circle(-14, -12, 5, 0x111827);
    const rightEye = this.add.circle(14, -12, 5, 0x111827);
    this.mouth = this.add.circle(0, 18, MOUTH_RADIUS, 0x7f1d1d).setScale(1.25, 0.72);

    this.head = this.add.container(x, y, [face, leftEye, rightEye, this.mouth]);
  }

  private createPopcorn(): void {
    const shadow = this.add.circle(2, 3, POPCORN_RADIUS, 0xd97706, 0.35);
    const kernel = this.add.circle(0, 0, POPCORN_RADIUS, 0xfff7ad);
    const bumpA = this.add.circle(-6, -7, 7, 0xffffff);
    const bumpB = this.add.circle(7, -5, 6, 0xfffbeb);
    const bumpC = this.add.circle(1, 7, 7, 0xfde68a);

    this.popcorn = this.add.container(0, 0, [shadow, kernel, bumpA, bumpB, bumpC]);
  }

  private moveHead(seconds: number): void {
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      this.head.x += (dx / length) * HEAD_SPEED * seconds;
      this.head.y += (dy / length) * HEAD_SPEED * seconds;
    }

    this.keepHeadOnScreen();
  }

  private keepHeadOnScreen(): void {
    this.head.x = Phaser.Math.Clamp(this.head.x, HEAD_RADIUS, this.scale.width - HEAD_RADIUS);
    this.head.y = Phaser.Math.Clamp(
      this.head.y,
      GAME_TOP_PADDING + HEAD_RADIUS,
      this.scale.height - HEAD_RADIUS,
    );
  }

  private launchPopcorn(): void {
    const fromLeft = Phaser.Math.Between(0, 1) === 0;
    const startX = fromLeft ? -POPCORN_RADIUS : this.scale.width + POPCORN_RADIUS;
    const startY = Phaser.Math.Between(GAME_TOP_PADDING + 20, this.scale.height - 180);
    const speedX = Phaser.Math.Between(POPCORN_MIN_SPEED_X, POPCORN_MAX_SPEED_X);
    const speedY = Phaser.Math.Between(POPCORN_MIN_SPEED_Y, POPCORN_MAX_SPEED_Y);

    this.popcorn.setPosition(startX, startY);
    this.popcornVelocity.set(fromLeft ? speedX : -speedX, speedY);
  }

  private movePopcorn(seconds: number): void {
    this.popcornVelocity.y += POPCORN_GRAVITY * seconds;
    this.popcorn.x += this.popcornVelocity.x * seconds;
    this.popcorn.y += this.popcornVelocity.y * seconds;
    this.popcorn.rotation += 5 * seconds;
  }

  private checkPopcornCatch(): void {
    const mouthX = this.head.x + this.mouth.x;
    const mouthY = this.head.y + this.mouth.y;
    const distanceToMouth = Phaser.Math.Distance.Between(
      mouthX,
      mouthY,
      this.popcorn.x,
      this.popcorn.y,
    );

    if (distanceToMouth > MOUTH_RADIUS + POPCORN_RADIUS) return;

    this.score += 1;
    this.scoreText.setText(`Счёт: ${this.score}`);
    this.launchPopcorn();
  }

  private checkPopcornMiss(): void {
    const fellBelowScreen = this.popcorn.y > this.scale.height + POPCORN_RADIUS;
    const flewPastLeft = this.popcorn.x < -POPCORN_RADIUS * 3;
    const flewPastRight = this.popcorn.x > this.scale.width + POPCORN_RADIUS * 3;

    if (!fellBelowScreen && !flewPastLeft && !flewPastRight) return;

    this.isGameOver = true;
    this.messageText.setText(`Игра окончена\nСчёт: ${this.score}\nSpace или клик — заново`);
  }

  private restartGame(): void {
    this.score = 0;
    this.isGameOver = false;
    this.scoreText.setText('Счёт: 0');
    this.messageText.setText('');
    this.head.setPosition(this.scale.width / 2, this.scale.height * 0.68);
    this.launchPopcorn();
  }
}
