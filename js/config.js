/**
 * Global namespace + every tunable constant of the game.
 * All other modules attach themselves to `window.WD`.
 */
(function () {
  'use strict';

  const WD = (window.WD = window.WD || {});

  WD.GAME_CONFIG = Object.freeze({
    maxAttempts: 3,

    // World (virtual pixels). The canvas is rendered at this height and scaled up.
    worldHeight: 320,
    minWorldWidth: 140,      // narrow enough that tall phones fill the screen
    groundHeight: 40,

    // Physics (pixels, seconds)
    gravity: 1050,
    jumpForce: 285,          // upward velocity applied on flap
    maxFallSpeed: 430,
    fixedTimeStep: 1 / 120,  // physics step
    maxFrameTime: 0.25,      // clamp after tab switches

    // Bird
    birdXRatio: 0.3,
    birdMinX: 44,
    birdMaxX: 110,
    birdHitRadius: 5.5,
    birdRotationUp: -0.45,   // radians
    birdRotationDown: 1.45,
    birdRotationSpeed: 4.2,  // radians per second when falling
    wingFrameTime: 0.09,
    readyBobAmplitude: 4,
    readyBobSpeed: 4,

    // Pipes
    pipeWidth: 26,
    pipeCapHeight: 12,
    pipeCapOverhang: 2,
    pipeSpeed: 88,
    pipeGap: 84,
    pipeSpacing: 142,        // horizontal distance between pipe pairs
    pipeSpawnInterval: 1.6,  // seconds, informative: spacing / speed
    pipeMinTopHeight: 34,
    pipeMaxGapShift: 92,     // max vertical gap move between consecutive pipes
    firstPipeDistance: 200,  // px ahead of the bird where the first pipe starts (~2.3 s)

    // Difficulty ramp
    speedIncreasePerPoint: 0.9,
    maxPipeSpeed: 124,
    gapDecreasePerPoint: 0.35,
    minPipeGap: 70,

    // Juice
    shakeOnHit: 5,
    shakeOnRecord: 3,
    shakeDuration: 0.35,
    deathPanelDelay: 650,    // ms after landing before the Game Over panel
    gameOverInputLock: 900,  // ms the panel buttons stay disabled (anti-mashing)
    maxParticles: 450,

    // Parallax factors (relative to pipe speed)
    parallax: Object.freeze({ clouds: 0.12, far: 0.25, near: 0.55, ground: 1 }),
    attractSpeed: 36,        // background scroll speed on menus
  });

  WD.USERNAME_RULES = Object.freeze({
    minLength: 3,
    maxLength: 32,
    // Telegram: latin letters, digits, underscores; must start with a letter.
    pattern: /^[a-z][a-z0-9_]*$/,
  });

  WD.UI_CONFIG = Object.freeze({
    leaderboardSize: 10,
    searchDebounceMs: 220,
    searchMaxResults: 6,
    introDuration: 1900,
    toastDuration: 2600,
    adminTapCount: 5,
    adminTapWindowMs: 2000,
  });

  WD.STORAGE_KEYS = Object.freeze({
    data: 'westdev.flappy.data',
    backup: 'westdev.flappy.backup',   // rolling mirror of the last good save
    undo: 'westdev.flappy.undo',       // snapshot before the last reset / import
    corrupted: 'westdev.flappy.corrupted',
    introSeen: 'westdev.flappy.introSeen', // sessionStorage
  });

  WD.STORAGE_VERSION = 1;
  WD.BACKUP_FILE_NAME = 'west-dev-flappy-backup.json';

  // Sweetie-16 inspired palette — used by canvas sprites and mirrored in css/variables.css
  WD.PALETTE = Object.freeze({
    ink: '#1a1c2c',
    plum: '#5d275d',
    red: '#b13e53',
    orange: '#ef7d57',
    yellow: '#ffcd75',
    lime: '#a7f070',
    green: '#38b764',
    teal: '#257179',
    navy: '#29366f',
    blue: '#3b5dc9',
    sky: '#41a6f6',
    cyan: '#73eff7',
    white: '#f4f4f4',
    silver: '#94b0c2',
    slate: '#566c86',
    shadow: '#333c57',
  });
})();
