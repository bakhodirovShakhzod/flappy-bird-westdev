/**
 * Parallax pixel-art background: sky -> sun -> clouds -> far city -> bushes ... ground.
 * Every layer is generated procedurally (seeded) into an offscreen tile once.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const CFG = WD.GAME_CONFIG;
  const P = WD.PALETTE;

  const SKY = { top: '#41a6f6', bands: ['#5cb6f5', '#7cc8f3', '#9cdaf1'], bandHeight: 14 };
  const CITY = { body: '#86b9df', shade: '#76a8d0', window: '#b5e2f5', sign: P.yellow, tileWidth: 288, height: 120 };
  const BUSH = { tileWidth: 200, height: 34 };
  const GROUND = { sand: '#d9a066', sandDark: '#c0874f', stripeA: P.lime, stripeB: P.green, tileWidth: 16 };

  /** Mulberry32 — tiny deterministic PRNG so the scenery is identical every launch. */
  function seededRandom(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return [c, ctx];
  }

  function pixelCircle(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
    }
  }

  /* ----------------------------- tiles ------------------------------ */

  function buildClouds() {
    const width = 520;
    const height = 70;
    const [canvas, ctx] = makeCanvas(width, height);
    const rnd = seededRandom(7);
    let x = 20;
    while (x < width - 70) {
      const cy = 18 + Math.floor(rnd() * 34);
      const puffs = 3 + Math.floor(rnd() * 3);
      const pts = [];
      for (let i = 0; i < puffs; i++) pts.push([x + i * 9, cy - Math.floor(rnd() * 6), 6 + Math.floor(rnd() * 5)]);
      pts.forEach(([px, py, r]) => pixelCircle(ctx, px, py + 2, r, '#cfe9f7'));
      pts.forEach(([px, py, r]) => pixelCircle(ctx, px, py, r, P.white));
      ctx.fillStyle = '#cfe9f7';
      ctx.fillRect(x - 8, cy + 6, puffs * 9 + 14, 2);
      x += puffs * 9 + 40 + Math.floor(rnd() * 60);
    }
    return canvas;
  }

  const MINI_LETTERS = {
    W: ['#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
    D: ['###.', '#..#', '#..#', '#..#', '###.'],
  };

  function drawMiniText(ctx, text, x, y, color) {
    ctx.fillStyle = color;
    let cursor = x;
    for (const ch of text) {
      const rows = MINI_LETTERS[ch];
      rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') ctx.fillRect(cursor + rx, y + ry, 1, 1);
      });
      cursor += rows[0].length + 1;
    }
  }

  function buildCity() {
    const [canvas, ctx] = makeCanvas(CITY.tileWidth, CITY.height);
    const rnd = seededRandom(2024);
    let x = 0;
    let index = 0;
    while (x < CITY.tileWidth) {
      const w = Math.min(CITY.tileWidth - x, 16 + Math.floor(rnd() * 18));
      const isSign = index === 3;
      const h = isSign ? 96 : 30 + Math.floor(rnd() * 70);
      const top = CITY.height - h;
      ctx.fillStyle = CITY.body;
      ctx.fillRect(x, top, w, h);
      ctx.fillStyle = CITY.shade;
      ctx.fillRect(x + w - 3, top, 3, h);
      if (rnd() > 0.5) ctx.fillRect(x + Math.floor(w / 2), top - 6, 1, 6); // antenna
      ctx.fillStyle = CITY.window;
      for (let wy = top + 5; wy < CITY.height - 6; wy += 6) {
        for (let wx = x + 3; wx < x + w - 5; wx += 4) {
          if (rnd() > 0.35) ctx.fillRect(wx, wy, 2, 3);
        }
      }
      if (isSign) {
        // West Dev rooftop sign
        ctx.fillStyle = P.ink;
        ctx.fillRect(x + 1, top - 10, 13, 9);
        drawMiniText(ctx, 'WD', x + 3, top - 8, CITY.sign);
        ctx.fillStyle = P.ink;
        ctx.fillRect(x + 4, top - 1, 1, 1);
        ctx.fillRect(x + 10, top - 1, 1, 1);
      }
      x += w + (rnd() > 0.6 ? 2 : 0);
      index++;
    }
    return canvas;
  }

  function buildBushes() {
    const [canvas, ctx] = makeCanvas(BUSH.tileWidth, BUSH.height);
    const rnd = seededRandom(99);
    const base = BUSH.height;
    // back row (darker) then front row
    [[P.teal, 14, 6], [P.green, 10, 2]].forEach(([color, rBase, drop]) => {
      for (let x = -10; x < BUSH.tileWidth + 10; x += 12 + Math.floor(rnd() * 8)) {
        const r = rBase + Math.floor(rnd() * 5);
        pixelCircle(ctx, x, base - r + drop + 6, r, color);
      }
    });
    // wrap seam: copy left edge to right edge region for seamless tiling
    ctx.drawImage(canvas, 0, 0, 12, BUSH.height, BUSH.tileWidth - 12, 0, 12, BUSH.height);
    // leaf highlights — only on pixels that are already bush
    const pixels = ctx.getImageData(0, 0, BUSH.tileWidth, BUSH.height).data;
    ctx.fillStyle = P.lime;
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(rnd() * BUSH.tileWidth);
      const y = base - 4 - Math.floor(rnd() * 14);
      if (pixels[(y * BUSH.tileWidth + x) * 4 + 3] > 0) ctx.fillRect(x, y, 1, 1);
    }
    return canvas;
  }

  function buildGround() {
    const [canvas, ctx] = makeCanvas(GROUND.tileWidth, CFG.groundHeight);
    ctx.fillStyle = GROUND.sand;
    ctx.fillRect(0, 0, GROUND.tileWidth, CFG.groundHeight);
    ctx.fillStyle = P.ink;
    ctx.fillRect(0, 0, GROUND.tileWidth, 1);
    // diagonal grass stripes
    for (let y = 1; y < 7; y++) {
      for (let x = 0; x < GROUND.tileWidth; x++) {
        ctx.fillStyle = (x + y) % 16 < 8 ? GROUND.stripeA : GROUND.stripeB;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = P.teal;
    ctx.fillRect(0, 7, GROUND.tileWidth, 2);
    ctx.fillStyle = GROUND.sandDark;
    ctx.fillRect(0, 9, GROUND.tileWidth, 1);
    [[3, 16], [11, 22], [6, 30], [14, 35], [1, 26]].forEach(([x, y]) => ctx.fillRect(x, y, 2, 1));
    return canvas;
  }

  /* --------------------------- background --------------------------- */

  class Background {
    constructor() {
      this.clouds = buildClouds();
      this.city = buildCity();
      this.bushes = buildBushes();
      this.ground = buildGround();
      this.sky = null;
      this.scroll = 0;
      this.time = 0;
    }

    resize(width, height) {
      this.width = width;
      this.height = height;
      this.groundY = height - CFG.groundHeight;
      this.sky = this.buildSky(width, height);
    }

    buildSky(width, height) {
      const [canvas, ctx] = makeCanvas(width, height);
      ctx.fillStyle = SKY.top;
      ctx.fillRect(0, 0, width, height);
      const bandsStart = this.groundY - 40 - SKY.bands.length * SKY.bandHeight;
      SKY.bands.forEach((color, i) => {
        const y = bandsStart + i * SKY.bandHeight;
        ctx.fillStyle = color;
        ctx.fillRect(0, y, width, height - y);
        // 2-row checker dither on the band edge (pixel-art instead of gradients)
        for (let x = 0; x < width; x++) {
          if (x % 2 === 0) ctx.fillRect(x, y - 1, 1, 1);
          if (x % 4 === 1) ctx.fillRect(x, y - 2, 1, 1);
        }
      });
      // sun
      const sunX = Math.round(width * 0.78);
      pixelCircle(ctx, sunX, 46, 15, '#fff1b8');
      pixelCircle(ctx, sunX, 46, 12, P.yellow);
      return canvas;
    }

    update(dt, speed) {
      this.time += dt;
      this.scroll += speed * dt;
    }

    drawTiled(ctx, tile, factor, y, extraDrift = 0) {
      const offset = Math.floor(this.scroll * factor + extraDrift) % tile.width;
      for (let x = -offset; x < this.width; x += tile.width) ctx.drawImage(tile, x, y);
    }

    /** Everything behind the pipes. */
    drawBack(ctx) {
      ctx.drawImage(this.sky, 0, 0);
      // clouds always drift a little, even when the world is stopped
      this.drawTiled(ctx, this.clouds, CFG.parallax.clouds, 12, this.time * 4);
      this.drawTiled(ctx, this.city, CFG.parallax.far, this.groundY - CITY.height + 8);
      this.drawTiled(ctx, this.bushes, CFG.parallax.near, this.groundY - BUSH.height + 2);
    }

    /** Ground — drawn in front of the pipes. */
    drawFront(ctx) {
      this.drawTiled(ctx, this.ground, CFG.parallax.ground, this.groundY);
    }
  }

  WD.game.Background = Background;
})();
