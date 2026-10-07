/**
 * The player bird: physics, wing animation, rotation and drawing.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const CFG = WD.GAME_CONFIG;
  const TILT_HOLD_TIME = 0.32;     // seconds the bird keeps looking up after a flap
  const FAST_WING_FACTOR = 0.55;   // wings flap faster right after a jump

  class Bird {
    constructor() {
      this.frames = WD.sprites.getBirdFrames();
      this.width = this.frames[0].width;
      this.height = this.frames[0].height;
      this.radius = CFG.birdHitRadius;
      this.reset(0, 0);
    }

    reset(x, y) {
      this.x = x;
      this.y = y;
      this.baseY = y;
      this.prevY = y;
      this.vy = 0;
      this.rotation = 0;
      this.prevRotation = 0;
      this.tiltHold = 0;
      this.frame = 1;
      this.frameTimer = 0;
      this.fastWings = 0;
      this.time = 0;
      this.alive = true;
      this.grounded = false;
    }

    flap() {
      if (!this.alive) return;
      this.vy = -CFG.jumpForce;
      this.tiltHold = TILT_HOLD_TIME;
      this.fastWings = TILT_HOLD_TIME;
    }

    savePrevious() {
      this.prevY = this.y;
      this.prevRotation = this.rotation;
    }

    /** Hovering before the first flap ("GET READY"). */
    updateIdle(dt) {
      this.savePrevious();
      this.time += dt;
      this.y = this.baseY + Math.sin(this.time * CFG.readyBobSpeed) * CFG.readyBobAmplitude;
      this.rotation = 0;
      this.animateWings(dt);
    }

    update(dt) {
      this.savePrevious();
      if (this.grounded) return;

      this.vy = Math.min(CFG.maxFallSpeed, this.vy + CFG.gravity * dt);
      this.y += this.vy * dt;

      if (this.tiltHold > 0 && this.alive) {
        this.tiltHold -= dt;
        this.rotation += (CFG.birdRotationUp - this.rotation) * Math.min(1, dt * 18);
      } else {
        this.rotation = Math.min(CFG.birdRotationDown, this.rotation + CFG.birdRotationSpeed * dt);
      }

      if (this.alive) this.animateWings(dt);
      else this.frame = 1;
    }

    animateWings(dt) {
      this.fastWings = Math.max(0, this.fastWings - dt);
      const frameTime = CFG.wingFrameTime * (this.fastWings > 0 ? FAST_WING_FACTOR : 1);
      this.frameTimer += dt;
      while (this.frameTimer >= frameTime) {
        this.frameTimer -= frameTime;
        this.frame = (this.frame + 1) % this.frames.length;
      }
    }

    land(groundY) {
      this.y = groundY - this.radius - 1;
      this.prevY = this.y;
      this.vy = 0;
      this.grounded = true;
      this.alive = false;
      this.rotation = CFG.birdRotationDown;
    }

    draw(ctx, alpha) {
      const y = this.prevY + (this.y - this.prevY) * alpha;
      const rotation = this.prevRotation + (this.rotation - this.prevRotation) * alpha;
      ctx.save();
      ctx.translate(Math.round(this.x), Math.round(y));
      ctx.rotate(rotation);
      ctx.drawImage(this.frames[this.frame], -Math.floor(this.width / 2), -Math.floor(this.height / 2));
      ctx.restore();
    }
  }

  WD.game.Bird = Bird;
})();
