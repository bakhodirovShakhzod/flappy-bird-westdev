/**
 * Original arcade sound effects synthesised with the Web Audio API.
 * (jump / score / hit / fall / button / new-record) — no audio files, no copyright issues.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const MASTER_VOLUME = 0.22;

  class SoundManager {
    constructor(enabled) {
      this.enabled = enabled;
      this.ctx = null;
      this.master = null;
      this.noiseBuffer = null;
    }

    setEnabled(enabled) {
      this.enabled = enabled;
      if (enabled) this.unlock();
    }

    /** Must be called from a user gesture (browser autoplay policy). */
    unlock() {
      try {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          this.ctx = new AudioCtx();
          this.master = this.ctx.createGain();
          this.master.gain.value = MASTER_VOLUME;
          this.master.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (err) {
        console.warn('[sound] unavailable', err);
        this.ctx = null;
      }
    }

    play(name) {
      if (!this.enabled) return;
      this.unlock();
      if (!this.ctx) return;
      const effect = SoundManager.EFFECTS[name];
      if (!effect) return;
      try {
        effect.call(this, this.ctx.currentTime + 0.005);
      } catch (err) {
        console.warn('[sound] play failed', err);
      }
    }

    /* ---------- synthesis primitives ---------- */

    tone(t, { type = 'square', from, to = from, duration, volume = 0.6, slide = 'exp' }) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, t);
      if (to !== from) {
        if (slide === 'exp') osc.frequency.exponentialRampToValueAtTime(to, t + duration);
        else osc.frequency.linearRampToValueAtTime(to, t + duration);
      }
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    }

    noise(t, { duration, volume = 0.6, filter = 1200 }) {
      if (!this.noiseBuffer) {
        const length = this.ctx.sampleRate * 0.5;
        this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = filter;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      src.connect(lp).connect(gain).connect(this.master);
      src.start(t);
      src.stop(t + duration + 0.02);
    }
  }

  SoundManager.EFFECTS = {
    jump(t) {
      this.tone(t, { from: 330, to: 720, duration: 0.09, volume: 0.35 });
    },
    score(t) {
      this.tone(t, { from: 988, duration: 0.06, volume: 0.3 });
      this.tone(t + 0.06, { from: 1319, duration: 0.14, volume: 0.3 });
    },
    hit(t) {
      this.noise(t, { duration: 0.22, volume: 0.9, filter: 1800 });
      this.tone(t, { type: 'square', from: 180, to: 60, duration: 0.2, volume: 0.5 });
    },
    fall(t) {
      this.tone(t, { type: 'triangle', from: 600, to: 120, duration: 0.45, volume: 0.45 });
    },
    button(t) {
      this.tone(t, { from: 660, duration: 0.04, volume: 0.25 });
      this.tone(t + 0.04, { from: 880, duration: 0.05, volume: 0.2 });
    },
    error(t) {
      this.tone(t, { from: 200, duration: 0.08, volume: 0.3 });
      this.tone(t + 0.1, { from: 150, duration: 0.12, volume: 0.3 });
    },
    newRecord(t) {
      [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(t + i * 0.07, { from: f, duration: 0.12, volume: 0.28 }));
      this.tone(t + 0.36, { type: 'triangle', from: 1568, duration: 0.35, volume: 0.3 });
    },
    champion(t) {
      [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(t + i * 0.09, { from: f, duration: 0.14, volume: 0.28 }));
      this.tone(t + 0.66, { type: 'triangle', from: 1047, to: 2093, duration: 0.5, volume: 0.3, slide: 'lin' });
    },
    intro(t) {
      [262, 330, 392, 523].forEach((f, i) => this.tone(t + i * 0.08, { type: 'triangle', from: f, duration: 0.16, volume: 0.35 }));
    },
  };

  WD.SoundManager = SoundManager;
})();
