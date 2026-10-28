export const gameplayConfig = {
  head: {
    speed: 320,
    catchSpeedMultiplier: 1.5,
    catchSpeedDurationMs: 500,
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
    topSpawnMinSpeedY: 90,
    topSpawnMaxSpeedY: 150,
    rotationSpeed: 5,
    missBoundsMultiplier: 3,
    sideSpawnYOffset: 20,
    sideSpawnBottomPadding: 180,
    bottomMinScreenReach: 0.6,
    bottomSpawnHorizontalDrift: 24,
  },
  layout: {
    topPadding: 104,
  },
  phases: {
    secondPhaseScoreThreshold: 1,
    secondPhasePopcornSpeedMultiplier: 1.25,
    secondPhaseMessageDurationMs: 2200,
  },
} as const;
