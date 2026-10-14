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
const SECOND_PHASE_DELAY_SECONDS = 10;
const SECOND_PHASE_POPCORN_SPEED_MULTIPLIER = 1.25;

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
  private timerText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private score = 0;
  private elapsedSeconds = 0;
  private popcornVelocity = new Phaser.Math.Vector2(0, 0);
  private isGameOver = false;
  private isPaused = false;
  private isSecondPhase = false;

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
      .text(width / 2, 62, 'Стрелки / WASD — двигай голову. P — пауза. Пропустил попкорн — игра окончена.', {
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

    this.timerText = this.add
      .text(width - 24, height - 48, `Фаза 1: ${SECOND_PHASE_DELAY_SECONDS}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(1, 0);

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
    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.input.on('pointerdown', () => {
      if (this.isGameOver) this.restartGame();
    });

    this.launchPopcorn();
  }

  update(_time: number, delta: number): void {
    if (!this.isGameOver && Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.togglePause();
    }

    if (this.isGameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) this.restartGame();
      return;
    }

    if (this.isPaused) return;

    const seconds = delta / 1000;
    this.updatePhaseTimer(seconds);
    this.moveHead(seconds);
    this.movePopcorn(seconds);
    this.checkPopcornCatch();
    this.checkPopcornMiss();
  }

  private updatePhaseTimer(seconds: number): void {
    if (this.isSecondPhase) return;

    this.elapsedSeconds += seconds;
    const secondsLeft = Math.max(0, Math.ceil(SECOND_PHASE_DELAY_SECONDS - this.elapsedSeconds));
    this.timerText.setText(`Фаза 1: ${secondsLeft}`);

    if (this.elapsedSeconds < SECOND_PHASE_DELAY_SECONDS) return;

    this.isSecondPhase = true;
    this.timerText.setText('Фаза 2');
    this.messageText.setText('Наступила вторая фаза!');
    this.time.delayedCall(2200, () => {
      if (!this.isGameOver && !this.isPaused) {
        this.messageText.setText('');
      }
    });
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
    const spawnSide = this.isSecondPhase ? Phaser.Math.Between(0, 3) : Phaser.Math.Between(0, 1);
    const speedX = Phaser.Math.Between(POPCORN_MIN_SPEED_X, POPCORN_MAX_SPEED_X);
    const speedY = Phaser.Math.Between(POPCORN_MIN_SPEED_Y, POPCORN_MAX_SPEED_Y);
    const speedMultiplier = this.isSecondPhase ? SECOND_PHASE_POPCORN_SPEED_MULTIPLIER : 1;

    let startX = 0;
    let startY = 0;
    let velocityX = 0;
    let velocityY = 0;

    if (spawnSide === 0 || spawnSide === 1) {
      const fromLeft = spawnSide === 0;
      startX = fromLeft ? -POPCORN_RADIUS : this.scale.width + POPCORN_RADIUS;
      startY = Phaser.Math.Between(GAME_TOP_PADDING + 20, this.scale.height - 180);
      velocityX = fromLeft ? speedX : -speedX;
      velocityY = speedY;
    } else {
      const fromTop = spawnSide === 2;
      startX = Phaser.Math.Between(POPCORN_RADIUS, this.scale.width - POPCORN_RADIUS);
      startY = fromTop ? -POPCORN_RADIUS : this.scale.height + POPCORN_RADIUS;
      velocityX = Phaser.Math.Between(-POPCORN_MAX_SPEED_X, POPCORN_MAX_SPEED_X);
      velocityY = fromTop ? Math.abs(speedY) : speedY;
    }

    this.popcorn.setPosition(startX, startY);
    this.popcornVelocity.set(velocityX * speedMultiplier, velocityY * speedMultiplier);
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
    const flewPastTop = this.popcorn.y < -POPCORN_RADIUS * 3;
    const flewPastLeft = this.popcorn.x < -POPCORN_RADIUS * 3;
    const flewPastRight = this.popcorn.x > this.scale.width + POPCORN_RADIUS * 3;

    if (!fellBelowScreen && !flewPastTop && !flewPastLeft && !flewPastRight) return;

    this.isGameOver = true;
    this.isPaused = false;
    this.messageText.setText(`Игра окончена\nСчёт: ${this.score}\nSpace или клик — заново`);
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.messageText.setText(this.isPaused ? 'Пауза\nP — продолжить' : '');
  }

  private restartGame(): void {
    this.score = 0;
    this.elapsedSeconds = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.isSecondPhase = false;
    this.scoreText.setText('Счёт: 0');
    this.timerText.setText(`Фаза 1: ${SECOND_PHASE_DELAY_SECONDS}`);
    this.messageText.setText('');
    this.head.setPosition(this.scale.width / 2, this.scale.height * 0.68);
    this.launchPopcorn();
  }
}
