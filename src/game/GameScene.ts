import Phaser from 'phaser';
import { PlayerHead } from './PlayerHead';
import { Popcorn } from './Popcorn';
import { gameplayConfig } from './gameplayConfig';

const TRAJECTORY_SAMPLE_SECONDS = 1 / 60;
const MAX_TRAJECTORY_DURATION_SECONDS = 10;

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
  private isThirdPhase = false;
  private isFourthPhase = false;
  private isThirdPhaseBounceEligible = false;
  private thirdPhaseTravelledDistance = 0;
  private thirdPhaseTotalTravelDistance = 0;
  private hasThirdPhaseBounced = false;
  private thirdPhaseWarning?: Phaser.GameObjects.Arc;
  private isWaitingForFourthPhaseSpawn = false;
  private fourthPhaseWarningElapsedMs = 0;
  private fourthPhaseSpawnPoint?: Phaser.Math.Vector2;
  private fourthPhaseWarning?: Phaser.GameObjects.Arc;
  private isShowingControlsHint = true;

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

    const controlHint = this.add.container(width / 2, height / 2);
    const keyStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '42px',
      color: '#ffffff',
      backgroundColor: '#334155',
      padding: { x: 16, y: 12 },
      align: 'center',
    };
    const keyGap = 18;
    const keyWidth = 78;
    const keyHeight = 76;
    const wasd = this.add.container(0, -12);
    const horizontalGap = keyWidth + keyGap;

    const addKeys = (
      group: Phaser.GameObjects.Container,
      top: string,
      left: string,
      down: string,
      right: string,
    ): void => {
      const makeKey = (x: number, y: number, label: string): Phaser.GameObjects.Text =>
        this.add
          .text(x, y, label, keyStyle)
          .setOrigin(0.5)
          .setFixedSize(keyWidth, keyHeight)
          .setAlign('center');

      group.add([
        makeKey(0, -(keyHeight + keyGap), top),
        makeKey(-horizontalGap, 0, left),
        makeKey(0, 0, down),
        makeKey(horizontalGap, 0, right),
      ]);
    };

    addKeys(wasd, 'W', 'A', 'S', 'D');
    const arrowsHint = this.add
      .text(0, keyHeight + 20, '↑  ↓', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);
    const controlsLabel = this.add
      .text(0, keyHeight + 48, 'WASD — движение', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);
    controlHint.add([wasd, arrowsHint, controlsLabel]);

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

    this.time.delayedCall(gameplayConfig.controlsHint.durationMs, () => {
      controlHint.destroy();
      this.isShowingControlsHint = false;
      this.launchPopcorn();
    });
  }

  update(_time: number, delta: number): void {
    if (!this.isGameOver && Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.togglePause();
    }

    if (this.isGameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) this.restartGame();
      return;
    }

    if (this.isPaused || this.isShowingControlsHint) return;

    const seconds = delta / 1000;
    this.moveHead(seconds);
    this.movePopcorn(seconds);
    this.checkPopcornCatch();
    this.checkPopcornMiss();
  }

  private checkPhaseStart(): void {
    if (!this.isSecondPhase) {
      const pointsLeft = gameplayConfig.phases.secondPhaseScoreThreshold - this.score;
      if (pointsLeft > 0) {
        this.timerText.setText(`Фаза 1: ${pointsLeft} очков`);
        return;
      }

      this.isSecondPhase = true;
      this.showPhaseMessage('Наступила вторая фаза!');
    }

    if (!this.isThirdPhase) {
      const pointsLeft = gameplayConfig.phases.thirdPhaseScoreThreshold - this.score;
      if (pointsLeft > 0) {
        this.timerText.setText(`Фаза 2: ${pointsLeft} очков`);
        return;
      }

      this.isThirdPhase = true;
      this.timerText.setText('Фаза 3');
      this.showPhaseMessage('Наступила третья фаза!');
    }
  }

  private showPhaseMessage(message: string): void {
    this.messageText.setText(message);
    this.time.delayedCall(gameplayConfig.phases.secondPhaseMessageDurationMs, () => {
      if (!this.isGameOver && !this.isPaused && this.messageText.text === message) {
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

    this.head.setEscapeBoost(this.isPopcornFlyingAway());
    this.head.move(dx, dy, seconds);
    this.head.keepOnScreen(this.scale.width, this.scale.height);
  }

  private isPopcornFlyingAway(): boolean {
    const distanceX = this.popcorn.x - this.head.mouthX;
    const distanceY = this.popcorn.y - this.head.mouthY;

    return distanceX * this.popcorn.velocityX + distanceY * this.popcorn.velocityY > 0;
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
    let keepInsideScreen = false;

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
      if (fromTop) {
        startY = -gameplayConfig.popcorn.radius;
        velocityX = startX < centerX ? speedX : -speedX;
        velocityY = Phaser.Math.Between(
          gameplayConfig.popcorn.topSpawnMinSpeedY,
          gameplayConfig.popcorn.topSpawnMaxSpeedY,
        );
      } else {
        keepInsideScreen = true;
        startY = this.scale.height - gameplayConfig.popcorn.radius;
        velocityX = Phaser.Math.Between(
          -gameplayConfig.popcorn.bottomSpawnHorizontalDrift,
          gameplayConfig.popcorn.bottomSpawnHorizontalDrift,
        );
        velocityY = this.getBottomPopcornSpeedY(startY);
      }
    }

    this.clearThirdPhaseWarning();
    this.popcorn.setPosition(startX, startY, keepInsideScreen);
    this.popcorn.setVelocity(velocityX * speedMultiplier, velocityY * speedMultiplier);
    this.isThirdPhaseBounceEligible = this.isThirdPhase && spawnSide !== 3;
    this.thirdPhaseTravelledDistance = 0;
    this.thirdPhaseTotalTravelDistance = this.isThirdPhaseBounceEligible
      ? this.calculateTrajectoryDistance(
          startX,
          startY,
          velocityX * speedMultiplier,
          velocityY * speedMultiplier,
          keepInsideScreen,
        )
      : 0;
    this.hasThirdPhaseBounced = false;
  }

  private getBottomPopcornSpeedY(startY: number): number {
    const targetY = this.scale.height * gameplayConfig.popcorn.bottomMinScreenReach;
    const distanceToTarget = startY - targetY;
    const minSpeedToReachTarget = Math.sqrt(2 * gameplayConfig.popcorn.gravity * distanceToTarget);

    return -Math.max(Math.abs(gameplayConfig.popcorn.minSpeedY), minSpeedToReachTarget);
  }

  private calculateTrajectoryDistance(
    startX: number,
    startY: number,
    velocityX: number,
    velocityY: number,
    keepInsideScreen: boolean,
  ): number {
    const missPadding = gameplayConfig.popcorn.radius * gameplayConfig.popcorn.missBoundsMultiplier;
    let x = startX;
    let y = startY;
    let currentVelocityY = velocityY;
    let distance = 0;

    for (let elapsed = 0; elapsed < MAX_TRAJECTORY_DURATION_SECONDS; elapsed += TRAJECTORY_SAMPLE_SECONDS) {
      currentVelocityY += gameplayConfig.popcorn.gravity * TRAJECTORY_SAMPLE_SECONDS;
      const nextX = keepInsideScreen
        ? Phaser.Math.Clamp(x + velocityX * TRAJECTORY_SAMPLE_SECONDS, gameplayConfig.popcorn.radius, this.scale.width - gameplayConfig.popcorn.radius)
        : x + velocityX * TRAJECTORY_SAMPLE_SECONDS;
      const nextY = keepInsideScreen
        ? Math.min(y + currentVelocityY * TRAJECTORY_SAMPLE_SECONDS, this.scale.height - gameplayConfig.popcorn.radius)
        : y + currentVelocityY * TRAJECTORY_SAMPLE_SECONDS;

      distance += Phaser.Math.Distance.Between(x, y, nextX, nextY);
      x = nextX;
      y = nextY;

      const hasFinished = keepInsideScreen
        ? y >= this.scale.height - gameplayConfig.popcorn.radius
        : y > this.scale.height + gameplayConfig.popcorn.radius || y < -missPadding || x < -missPadding || x > this.scale.width + missPadding;
      if (hasFinished) return distance;
    }

    return distance;
  }

  private movePopcorn(seconds: number): void {
    const previousX = this.popcorn.x;
    const previousY = this.popcorn.y;
    this.popcorn.move(seconds, this.scale.width, this.scale.height);
    this.thirdPhaseTravelledDistance += Phaser.Math.Distance.Between(
      previousX,
      previousY,
      this.popcorn.x,
      this.popcorn.y,
    );
    this.updateThirdPhaseWarning();
    this.tryThirdPhaseBounce();
  }

  private updateThirdPhaseWarning(): void {
    if (!this.isThirdPhaseBounceEligible || this.hasThirdPhaseBounced) return;

    const warningDistance = this.thirdPhaseTotalTravelDistance * gameplayConfig.phases.thirdPhaseWarningPathRatio;
    if (this.thirdPhaseTravelledDistance < warningDistance) return;

    if (!this.thirdPhaseWarning) {
      this.thirdPhaseWarning = this.add
        .circle(this.popcorn.x, this.popcorn.y, gameplayConfig.popcorn.radius * 1.7, 0xff6b35, 0)
        .setStrokeStyle(3, 0xff6b35, 1);
    }

    const pulse = (Math.sin(this.time.now / 80) + 1) / 2;
    this.thirdPhaseWarning.setPosition(this.popcorn.x, this.popcorn.y).setAlpha(0.45 + pulse * 0.55);
  }

  private clearThirdPhaseWarning(): void {
    this.thirdPhaseWarning?.destroy();
    this.thirdPhaseWarning = undefined;
  }

  private tryThirdPhaseBounce(): void {
    if (!this.isThirdPhaseBounceEligible || this.hasThirdPhaseBounced) return;

    const bounceDistance = this.thirdPhaseTotalTravelDistance * gameplayConfig.phases.thirdPhaseBouncePathRatio;
    if (this.thirdPhaseTravelledDistance < bounceDistance) return;
    if (this.popcorn.y >= this.scale.height - gameplayConfig.popcorn.radius) return;

    const burst = this.add.circle(this.popcorn.x, this.popcorn.y, gameplayConfig.popcorn.radius, 0xffffff, 0.8);
    const bounceVelocity = this.getBounceVelocity();

    this.hasThirdPhaseBounced = true;
    this.clearThirdPhaseWarning();
    this.popcorn.bounceBack(bounceVelocity.x, bounceVelocity.y);
    this.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 2.5,
      duration: 180,
      onComplete: () => burst.destroy(),
    });
  }

  private getBounceVelocity(): Phaser.Math.Vector2 {
    const bottomY = this.scale.height - gameplayConfig.popcorn.radius;
    const distanceToBottom = bottomY - this.popcorn.y;
    const minimumArcDuration = Math.sqrt((2 * distanceToBottom) / gameplayConfig.popcorn.gravity) + 0.1;
    const duration = Math.max(gameplayConfig.phases.thirdPhaseBounceDurationMs / 1000, minimumArcDuration);
    const direction = this.popcorn.velocityX > 0 ? -1 : 1;
    const horizontalSpace = direction < 0
      ? this.popcorn.x - gameplayConfig.popcorn.radius
      : this.scale.width - gameplayConfig.popcorn.radius - this.popcorn.x;
    const horizontalDistance = Math.min(this.scale.width * 0.35, horizontalSpace);
    const horizontalSpeed = (horizontalDistance / duration) * direction;
    const verticalSpeed = (distanceToBottom - (gameplayConfig.popcorn.gravity * duration * duration) / 2) / duration;

    return new Phaser.Math.Vector2(horizontalSpeed, verticalSpeed);
  }

  private checkPopcornCatch(): void {
    if (!this.isPopcornCaught(this.popcorn)) return;

    this.score += 1;
    this.head.boostSpeed();
    this.scoreText.setText(`Счёт: ${this.score}`);
    this.checkPhaseStart();
    this.launchPopcorn();
  }

  private isPopcornCaught(popcorn: Popcorn): boolean {
    const distanceToMouth = Phaser.Math.Distance.Between(
      this.head.mouthX,
      this.head.mouthY,
      popcorn.x,
      popcorn.y,
    );

    return distanceToMouth <= gameplayConfig.mouth.radius + gameplayConfig.popcorn.radius;
  }

  private checkPopcornMiss(): void {
    if (!this.popcorn.isOutOfBounds(this.scale.width, this.scale.height)) return;

    this.isGameOver = true;
    this.isPaused = false;
    this.clearThirdPhaseWarning();
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
    this.isThirdPhase = false;
    this.isShowingControlsHint = false;
    this.isThirdPhaseBounceEligible = false;
    this.thirdPhaseTravelledDistance = 0;
    this.thirdPhaseTotalTravelDistance = 0;
    this.hasThirdPhaseBounced = false;
    this.clearThirdPhaseWarning();
    this.scoreText.setText('Счёт: 0');
    this.timerText.setText(`Фаза 1: ${gameplayConfig.phases.secondPhaseScoreThreshold} очков`);
    this.messageText.setText('');
    this.head.setPosition(this.scale.width / 2, this.scale.height * gameplayConfig.head.startYRatio);
    this.launchPopcorn();
  }
}
