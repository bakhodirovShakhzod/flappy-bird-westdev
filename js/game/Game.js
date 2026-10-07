/**
 * Game orchestrator: owns the canvas, entities and the state machine.
 *
 *   attract (menu background) -> ready -> playing -> dying -> over
 *
 * Per fixed step:  input (queued) -> update -> physics -> collision -> score -> (render)
 * It knows nothing about storage or DOM menus — it reports through callbacks.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const CFG = WD.GAME_CONFIG;
  const { Bird, PipeManager, ParticleSystem, Background, Collision, GameLoop, Input } = WD.game;

  const MODE = Object.freeze({ ATTRACT: 'attract', READY: 'ready', PLAYING: 'playing', DYING: 'dying', OVER: 'over' });
  const FLASH_DURATION = 0.12;

  class Game {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {object} deps
     * @param {WD.SoundManager} deps.sound
     * @param {object} deps.events { onModeChange, onScore, onNewRecord, onCrash, onRunEnd }
     */
    constructor(canvas, { sound, events }) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.sound = sound;
      this.events = events;

      this.background = new Background();
      this.bird = new Bird();
      this.pipes = new PipeManager();
      this.particles = new ParticleSystem();

      this.mode = MODE.ATTRACT;
      this.score = 0;
      this.previousBest = 0;
      this.recordAnnounced = false;
      this.pendingFlaps = 0;
      this.runFinalized = true;
      this.shakeTime = 0;
      this.shakeAmp = 0;
      this.flashTime = 0;
      this.endTimer = null;

      this.loop = new GameLoop({
        update: (dt) => this.update(dt),
        render: (alpha) => this.render(alpha),
        step: CFG.fixedTimeStep,
        maxFrameTime: CFG.maxFrameTime,
      });
      this.input = new Input(canvas, () => this.acceptsFlap(), () => this.queueFlap());

      this.resize = this.resize.bind(this);
      window.addEventListener('resize', this.resize);
      this.resize();
    }

    start() {
      this.loop.start();
    }

    get fps() {
      return this.loop.fps;
    }

    /* ----------------------------- viewport ----------------------------- */

    resize() {
      const height = CFG.worldHeight;
      const aspect = window.innerWidth / Math.max(1, window.innerHeight);
      const width = Math.max(CFG.minWorldWidth, Math.round(height * aspect));
      this.canvas.width = width;
      this.canvas.height = height;
      this.ctx.imageSmoothingEnabled = false;
      this.width = width;
      this.height = height;
      this.groundY = height - CFG.groundHeight;
      this.birdX = Math.round(Math.min(CFG.birdMaxX, Math.max(CFG.birdMinX, width * CFG.birdXRatio)));
      this.background.resize(width, height);
      this.pipes.setWorldWidth(width);
      this.pipes.groundY = this.groundY;
      this.bird.x = this.birdX;
      if (this.mode === MODE.READY) this.bird.baseY = this.readyY();
      this.render(1);
    }

    readyY() {
      return Math.round(this.groundY * 0.45);
    }

    /* ------------------------------ control ----------------------------- */

    /** Begins a new run in READY state. The attempt must already be consumed by the caller. */
    startRun({ bestScore }) {
      clearTimeout(this.endTimer);
      this.score = 0;
      this.previousBest = bestScore || 0;
      this.recordAnnounced = false;
      this.pendingFlaps = 0;
      this.runFinalized = false;
      this.flashTime = 0;
      this.shakeTime = 0;
      this.particles.clear();
      this.pipes.reset(this.width, this.groundY, this.birdX + CFG.firstPipeDistance);
      this.bird.reset(this.birdX, this.readyY());
      this.setMode(MODE.READY);
    }

    toAttract() {
      clearTimeout(this.endTimer);
      this.particles.clear();
      this.pipes.reset(this.width, this.groundY);
      this.setMode(MODE.ATTRACT);
    }

    /**
     * Returns the score of an unfinished run exactly once (used on page unload).
     * @returns {number|null}
     */
    abandonRun() {
      if (this.runFinalized || this.mode === MODE.ATTRACT) return null;
      this.runFinalized = true;
      clearTimeout(this.endTimer);
      return this.score;
    }

    acceptsFlap() {
      return this.mode === MODE.READY || this.mode === MODE.PLAYING;
    }

    queueFlap() {
      this.pendingFlaps++;
    }

    setMode(mode) {
      if (this.mode === mode) return;
      this.mode = mode;
      if (this.events.onModeChange) this.events.onModeChange(mode);
    }

    /* ------------------------------ update ------------------------------ */

    update(dt) {
      this.handleInput();

      switch (this.mode) {
        case MODE.ATTRACT:
          this.background.update(dt, CFG.attractSpeed);
          break;
        case MODE.READY:
          this.background.update(dt, CFG.attractSpeed);
          this.bird.updateIdle(dt);
          break;
        case MODE.PLAYING:
          this.updatePlaying(dt);
          break;
        case MODE.DYING:
          this.updateDying(dt);
          break;
        default:
          this.background.update(dt, 0);
          this.bird.savePrevious();
      }

      this.particles.update(dt);
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      this.flashTime = Math.max(0, this.flashTime - dt);
    }

    handleInput() {
      if (!this.pendingFlaps) return;
      this.pendingFlaps = 0; // several presses inside one 8ms step still mean one flap
      if (!this.acceptsFlap()) return;
      if (this.mode === MODE.READY) this.setMode(MODE.PLAYING);
      this.bird.flap();
      this.particles.jumpPuff(this.bird.x, this.bird.y);
      this.sound.play('jump');
    }

    currentSpeed() {
      return Math.min(CFG.maxPipeSpeed, CFG.pipeSpeed + this.score * CFG.speedIncreasePerPoint);
    }

    currentGap() {
      return Math.max(CFG.minPipeGap, CFG.pipeGap - this.score * CFG.gapDecreasePerPoint);
    }

    updatePlaying(dt) {
      const speed = this.currentSpeed();
      this.background.update(dt, speed);
      this.pipes.update(dt, speed, this.currentGap());
      this.bird.update(dt);

      // ceiling: the bird may not leave the screen upwards
      if (this.bird.y < -this.bird.height) {
        this.bird.y = -this.bird.height;
        this.bird.vy = Math.max(0, this.bird.vy);
      }

      if (Collision.hitsGround(this.bird, this.groundY)) {
        this.crash(false);
        return;
      }
      if (Collision.hitsPipe(this.bird, this.pipes.pipes, this.groundY)) {
        this.crash(true);
        return;
      }

      const passed = this.pipes.collectPassed(this.bird.x);
      if (passed > 0) this.addScore(passed);
    }

    addScore(points) {
      this.score += points;
      this.particles.scorePop(this.bird.x, this.bird.y - 14);
      this.sound.play('score');
      if (this.events.onScore) this.events.onScore(this.score);

      if (!this.recordAnnounced && this.previousBest > 0 && this.score > this.previousBest) {
        this.recordAnnounced = true;
        this.particles.recordStars(this.bird.x, this.bird.y - 10);
        this.shake(CFG.shakeOnRecord);
        this.sound.play('newRecord');
        if (this.events.onNewRecord) this.events.onNewRecord(this.score);
      }
    }

    crash(hitPipe) {
      this.bird.alive = false;
      this.bird.tiltHold = 0;
      this.pipes.freeze();
      this.shake(CFG.shakeOnHit);
      this.flashTime = FLASH_DURATION;
      this.particles.hitBurst(this.bird.x, this.bird.y);
      this.sound.play('hit');
      if (this.events.onCrash) this.events.onCrash();

      if (hitPipe) {
        this.bird.vy = Math.min(this.bird.vy, 0) * 0.3;
        setTimeout(() => this.sound.play('fall'), 180);
        this.setMode(MODE.DYING);
      } else {
        this.bird.land(this.groundY);
        this.finishRun();
      }
    }

    updateDying(dt) {
      this.background.update(dt, 0);
      this.pipes.freeze();
      this.bird.update(dt);
      if (Collision.hitsGround(this.bird, this.groundY)) {
        this.bird.land(this.groundY);
        this.particles.dust(this.bird.x, this.groundY);
        this.shake(CFG.shakeOnHit * 0.5);
        this.finishRun();
      }
    }

    /** Shows the result after a short pause; until then abandonRun() can still save it. */
    finishRun() {
      this.setMode(MODE.OVER);
      clearTimeout(this.endTimer);
      this.endTimer = setTimeout(() => this.completeRun(), CFG.deathPanelDelay);
    }

    completeRun() {
      if (this.runFinalized) return;
      this.runFinalized = true;
      if (this.events.onRunEnd) this.events.onRunEnd(this.score);
    }

    shake(amplitude) {
      this.shakeAmp = Math.max(amplitude, this.shakeTime > 0 ? this.shakeAmp : 0);
      this.shakeTime = CFG.shakeDuration;
    }

    /* ------------------------------ render ------------------------------ */

    render(alpha) {
      const ctx = this.ctx;
      ctx.save();
      if (this.shakeTime > 0) {
        const k = this.shakeTime / CFG.shakeDuration;
        const amp = this.shakeAmp * k;
        ctx.translate(Math.round((Math.random() * 2 - 1) * amp), Math.round((Math.random() * 2 - 1) * amp));
      }

      this.background.drawBack(ctx);
      if (this.mode !== MODE.ATTRACT) this.pipes.draw(ctx, alpha);
      this.background.drawFront(ctx);
      if (this.mode !== MODE.ATTRACT) this.bird.draw(ctx, alpha);
      this.particles.draw(ctx);
      ctx.restore();

      if (this.flashTime > 0) {
        ctx.fillStyle = WD.PALETTE.white;
        ctx.fillRect(0, 0, this.width, this.height);
      }
    }
  }

  Game.MODE = MODE;
  WD.game.Game = Game;
})();
