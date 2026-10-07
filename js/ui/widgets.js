/**
 * Small reusable UI building blocks.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const { h } = WD.dom;
  const BIRD_FRAME_MS = 110;

  /** ❤️ ❤️ 🖤 — filled hearts first. */
  function hearts(attemptsLeft, scale = 3) {
    const max = WD.GAME_CONFIG.maxAttempts;
    const left = Math.max(0, Math.min(max, attemptsLeft));
    const wrap = h('span', { class: 'hearts', role: 'img', 'aria-label': `${left} of ${max} attempts left` });
    for (let i = 0; i < max; i++) {
      wrap.appendChild(i < left ? WD.sprites.icon('heart', scale) : WD.sprites.icon('heartEmpty', scale, 'px-icon--lost'));
    }
    return wrap;
  }

  function stat(label, value, className = '') {
    const valueNode = value instanceof Node ? value : h('span', { class: 'stat__value', text: String(value) });
    return h('div', { class: `stat ${className}`.trim() }, [h('span', { class: 'stat__label', text: label }), valueNode]);
  }

  /** Animated flapping bird <img>. Returns { el, stop }. */
  function flappingBird(scale = 4) {
    const frames = WD.sprites.getBirdFrames();
    const img = WD.sprites.birdImage(0, scale);
    let frame = 0;
    const timer = setInterval(() => {
      frame = (frame + 1) % frames.length;
      img.src = WD.sprites.birdFrameUrl(frame);
    }, BIRD_FRAME_MS);
    return { el: img, stop: () => clearInterval(timer) };
  }

  /** Mounts a flapping bird into a container (replacing its content). */
  function mountBird(container, scale) {
    WD.dom.clear(container);
    const bird = flappingBird(scale);
    container.appendChild(bird.el);
    return bird;
  }

  /** "🏆 YOU ARE #4" / "#27" / "—" as a node. */
  function rankValue(rank) {
    const top = WD.UI_CONFIG.leaderboardSize;
    if (!rank) return h('span', { class: 'stat__value', text: '—' });
    if (rank <= top) {
      return h('span', { class: 'stat__value stat__value--rank-top' }, [
        WD.sprites.icon('trophy', 2), ` YOU ARE #${rank}`,
      ]);
    }
    return h('span', { class: 'stat__value', text: `#${rank}` });
  }

  function medalIcon(rank, scale = 3) {
    const names = { 1: 'medal', 2: 'medalSilver', 3: 'medalBronze' };
    return names[rank] ? WD.sprites.icon(names[rank], scale) : null;
  }

  WD.ui = WD.ui || {};
  WD.ui.widgets = Object.freeze({ hearts, stat, flappingBird, mountBird, rankValue, medalIcon });
})();
