export const gameplayConfig = {
  head: {
    speed: 320,
    radius: 42,
    startYRatio: 0.68,
  },
  mouth: {
    radius: 22,
  },
  popcorn: {
    radius: 12,
    gravity: 520,
    minSpeedX: 150,
    maxSpeedX: 260,
    minSpeedY: -360,
    maxSpeedY: -240,
    rotationSpeed: 5,
    missBoundsMultiplier: 3,
    sideSpawnYOffset: 20,
    sideSpawnBottomPadding: 180,
    bottomMinScreenReach: 0.6,
  },
  layout: {
    topPadding: 104,
  },
  phases: {
    secondPhaseScoreThreshold: 5,
    secondPhasePopcornSpeedMultiplier: 1.25,
    secondPhaseMessageDurationMs: 2200,
  },
} as const;
