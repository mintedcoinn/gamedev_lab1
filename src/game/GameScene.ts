import Phaser from 'phaser';
import { PlayerHead } from './PlayerHead';
import { Popcorn } from './Popcorn';
import { gameplayConfig } from './gameplayConfig';

/**
 * Простая игра: двигаем голову и ловим летящий попкорн ртом.
 */
export class GameScene extends Phaser.Scene {
  private head!: PlayerHead;
  private popcorn!: Popcorn;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private score = 0;
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

    this.head = new PlayerHead(this, width / 2, height * gameplayConfig.head.startYRatio);
    this.popcorn = new Popcorn(this);

    this.scoreText = this.add.text(24, height - 48, 'Счёт: 0', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
    });

    this.timerText = this.add
      .text(width - 24, height - 48, `Фаза 1: ${gameplayConfig.phases.secondPhaseScoreThreshold} очков`, {
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
    this.moveHead(seconds);
    this.movePopcorn(seconds);
    this.checkPopcornCatch();
    this.checkPopcornMiss();
  }

  private checkSecondPhaseStart(): void {
    if (this.isSecondPhase) return;

    const pointsLeft = gameplayConfig.phases.secondPhaseScoreThreshold - this.score;
    if (pointsLeft > 0) {
      this.timerText.setText(`Фаза 1: ${pointsLeft} очков`);
      return;
    }

    this.isSecondPhase = true;
    this.timerText.setText('Фаза 2');
    this.messageText.setText('Наступила вторая фаза!');
    this.time.delayedCall(gameplayConfig.phases.secondPhaseMessageDurationMs, () => {
      if (!this.isGameOver && !this.isPaused) {
        this.messageText.setText('');
      }
    });
  }

  private moveHead(seconds: number): void {
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) dy += 1;

    this.head.move(dx, dy, seconds);
    this.head.keepOnScreen(this.scale.width, this.scale.height);
  }

  private launchPopcorn(): void {
    const spawnSide = this.isSecondPhase ? Phaser.Math.Between(0, 3) : Phaser.Math.Between(0, 1);
    const speedX = Phaser.Math.Between(gameplayConfig.popcorn.minSpeedX, gameplayConfig.popcorn.maxSpeedX);
    const speedY = Phaser.Math.Between(gameplayConfig.popcorn.minSpeedY, gameplayConfig.popcorn.maxSpeedY);
    const speedMultiplier = this.isSecondPhase ? gameplayConfig.phases.secondPhasePopcornSpeedMultiplier : 1;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    let startX = 0;
    let startY = 0;
    let velocityX = 0;
    let velocityY = 0;

    if (spawnSide === 0 || spawnSide === 1) {
      const fromLeft = spawnSide === 0;
      const minSideStartY = Math.min(
        Math.max(
          gameplayConfig.layout.topPadding + gameplayConfig.popcorn.sideSpawnYOffset,
          centerY + gameplayConfig.popcorn.sideSpawnYOffset,
        ),
        this.scale.height - gameplayConfig.popcorn.sideSpawnBottomPadding,
      );
      startX = fromLeft ? -gameplayConfig.popcorn.radius : this.scale.width + gameplayConfig.popcorn.radius;
      startY = Phaser.Math.Between(minSideStartY, this.scale.height - gameplayConfig.popcorn.sideSpawnBottomPadding);
      velocityX = fromLeft ? speedX : -speedX;
      velocityY = speedY;
    } else {
      const fromTop = spawnSide === 2;
      startX = Phaser.Math.Between(gameplayConfig.popcorn.radius, this.scale.width - gameplayConfig.popcorn.radius);
      startY = fromTop ? -gameplayConfig.popcorn.radius : this.scale.height + gameplayConfig.popcorn.radius;
      velocityX = startX < centerX ? speedX : -speedX;
      velocityY = fromTop ? Math.abs(speedY) : this.getBottomPopcornSpeedY(startY);
    }

    this.popcorn.setPosition(startX, startY);
    this.popcorn.setVelocity(velocityX * speedMultiplier, velocityY * speedMultiplier);
  }

  private getBottomPopcornSpeedY(startY: number): number {
    const targetY = this.scale.height * gameplayConfig.popcorn.bottomMinScreenReach;
    const distanceToTarget = startY - targetY;
    const minSpeedToReachTarget = Math.sqrt(2 * gameplayConfig.popcorn.gravity * distanceToTarget);

    return -Math.max(Math.abs(gameplayConfig.popcorn.minSpeedY), minSpeedToReachTarget);
  }

  private movePopcorn(seconds: number): void {
    this.popcorn.move(seconds);
  }

  private checkPopcornCatch(): void {
    const distanceToMouth = Phaser.Math.Distance.Between(
      this.head.mouthX,
      this.head.mouthY,
      this.popcorn.x,
      this.popcorn.y,
    );

    if (distanceToMouth > gameplayConfig.mouth.radius + gameplayConfig.popcorn.radius) return;

    this.score += 1;
    this.scoreText.setText(`Счёт: ${this.score}`);
    this.checkSecondPhaseStart();
    this.launchPopcorn();
  }

  private checkPopcornMiss(): void {
    if (!this.popcorn.isOutOfBounds(this.scale.width, this.scale.height)) return;

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
    this.isGameOver = false;
    this.isPaused = false;
    this.isSecondPhase = false;
    this.scoreText.setText('Счёт: 0');
    this.timerText.setText(`Фаза 1: ${gameplayConfig.phases.secondPhaseScoreThreshold} очков`);
    this.messageText.setText('');
    this.head.setPosition(this.scale.width / 2, this.scale.height * gameplayConfig.head.startYRatio);
    this.launchPopcorn();
  }
}
