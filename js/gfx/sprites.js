/**
 * All pixel art lives here as character maps — no external image files.
 * Each map is rendered once into an offscreen canvas (and cached).
 */
(function () {
  'use strict';

  const WD = window.WD;
  const P = WD.PALETTE;

  /** Shared colour keys for every map. '.' = transparent. */
  const COLORS = {
    k: P.ink, y: P.yellow, o: P.orange, r: P.red, w: P.white, s: P.silver, g: P.slate,
    G: P.green, L: P.lime, b: P.blue, B: P.navy, c: P.cyan, t: P.teal, d: P.shadow, p: P.plum,
    m: '#e0a040', // medal gold shade
    n: '#c87038', // bronze
  };

  /* ----------------------------- bird ----------------------------- */
  const BIRD_BODY = [
    '.....kkkkkk......',
    '...kkyyyykwwk....',
    '..kyyyyyykwwwwk..',
    '.kyyyyyyykwwwkwk.',
    '.kyyyyyyykwwwkwk.',
    'kyyyyyyyyykwwwwk.',
    'kyyyyyyyyyykkkkkk',
    'kyyyyyyyyykrrrrrk',
    '.kyyyyyyykrkkkkk.',
    '.kooooooookrrrrk.',
    '..kkoooooookkkk..',
    '....kkkkkkk......',
  ];
  const WINGS = {
    up: { x: 1, y: 2, rows: ['kwwwk.', 'kwwwwk', '.kwwwk', '..kkk.'] },
    mid: { x: 0, y: 5, rows: ['kwwwwk', 'kwwwwk', '.kkkk.'] },
    down: { x: 1, y: 6, rows: ['.kkkk.', 'kwwwwk', 'kwwwk.', '.kkk..'] },
  };

  function composeBird(wing) {
    const rows = BIRD_BODY.map((r) => r.split(''));
    wing.rows.forEach((line, dy) => {
      line.split('').forEach((ch, dx) => {
        if (ch !== '.') rows[wing.y + dy][wing.x + dx] = ch;
      });
    });
    return rows.map((r) => r.join(''));
  }

  /* ----------------------------- icons ---------------------------- */
  const ICONS = {
    heart: ['.rr.rr.', 'rwrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
    heartEmpty: ['.gg.gg.', 'gddgddg', 'gdddddg', '.gdddg.', '..gdg..', '...g...'],
    crown: ['y...y...y', 'yy.yyy.yy', 'yyyyyyyyy', 'yrryyyrry', 'yyyyyyyyy', 'ooooooooo'],
    trophy: [
      'yyyyyyyyy', 'yoyyyyyoy', 'y.yyyyy.y', '.yyyyyyy.', '..yyyyy..',
      '...yyy...', '....y....', '...ooo...', '..ooooo..',
    ],
    medal: ['bb...bb', '.bb.bb.', '..bbb..', '.mmmmm.', 'mmyyymm', 'mmyymmm', 'mmyyymm', '.mmmmm.'],
    medalSilver: ['bb...bb', '.bb.bb.', '..bbb..', '.ggggg.', 'ggwwwgg', 'ggwwggg', 'ggwwwgg', '.ggggg.'],
    medalBronze: ['bb...bb', '.bb.bb.', '..bbb..', '.nnnnn.', 'nnooonn', 'nnoonnn', 'nnooonn', '.nnnnn.'],
    star: ['...y...', '...y...', 'yyyyyyy', '.yyyyy.', '..yyy..', '.yy.yy.', 'yy...yy'],
    search: ['.wwww...', 'w....w..', 'w....w..', 'w....w..', 'w....w..', '.wwwwww.', '.....ww.', '......ww'],
    soundOn: ['...w.....', '..ww..w..', 'www.w..w.', 'w.w..w.w.', 'www.w..w.', '..ww..w..', '...w.....'],
    soundOff: ['...w.....', '..ww.....', 'www.w.w.w', 'w.w...w..', 'www.w.w.w', '..ww.....', '...w.....'],
    fullscreen: ['www.www', 'w.....w', 'w.....w', '.......', 'w.....w', 'w.....w', 'www.www'],
    user: ['..www..', '.wwwww.', '.wwwww.', '..www..', '.......', 'wwwwwww', 'wwwwwww'],
    gear: ['..w.w..', '.wwwww.', 'wwk.kww', '.w...w.', 'wwk.kww', '.wwwww.', '..w.w..'],
    arrowLeft: ['...w...', '..ww...', '.wwwwww', 'wwwwwww', '.wwwwww', '..ww...', '...w...'],
  };

  /** Icons that get an automatic 1px ink outline so they read on any background. */
  const OUTLINED = new Set(['heart', 'crown', 'trophy', 'star']);

  /* --------------------------- rendering --------------------------- */
  const cache = new Map();

  /** Adds a 1px 'k' border around every opaque pixel (map grows by 2 in each direction). */
  function outlineMap(rows) {
    const height = rows.length + 2;
    const width = Math.max(...rows.map((r) => r.length)) + 2;
    const at = (x, y) => (rows[y - 1] && rows[y - 1][x - 1]) || '.';
    const out = [];
    for (let y = 0; y < height; y++) {
      let line = '';
      for (let x = 0; x < width; x++) {
        let ch = at(x, y);
        if (ch === '.') {
          const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) !== '.');
          if (touches) ch = 'k';
        }
        line += ch;
      }
      out.push(line);
    }
    return out;
  }

  function renderMap(rows, scale = 1) {
    const height = rows.length;
    const width = Math.max(...rows.map((r) => r.length));
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = COLORS[row[x]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    });
    return canvas;
  }

  function cached(key, factory) {
    if (!cache.has(key)) cache.set(key, factory());
    return cache.get(key);
  }

  const BIRD_FRAME_ORDER = ['up', 'mid', 'down', 'mid'];

  /** @returns {HTMLCanvasElement[]} bird animation frames (1x) */
  function getBirdFrames() {
    return cached('bird', () => BIRD_FRAME_ORDER.map((name) => renderMap(composeBird(WINGS[name]))));
  }

  function getIconCanvas(name) {
    if (!ICONS[name]) throw new Error(`Unknown icon ${name}`);
    return cached(`icon:${name}`, () => renderMap(OUTLINED.has(name) ? outlineMap(ICONS[name]) : ICONS[name]));
  }

  function getIconUrl(name) {
    return cached(`url:${name}`, () => getIconCanvas(name).toDataURL());
  }

  /**
   * DOM pixel icon (crisp, scaled with CSS image-rendering: pixelated).
   * @param {string} name
   * @param {number} scale
   */
  function icon(name, scale = 3, className = '') {
    const source = getIconCanvas(name);
    return WD.dom.h('img', {
      class: `px-icon ${className}`.trim(),
      src: getIconUrl(name),
      width: source.width * scale,
      height: source.height * scale,
      alt: '',
      draggable: 'false',
    });
  }

  function birdImage(frame = 1, scale = 4, className = '') {
    const canvas = getBirdFrames()[frame];
    return WD.dom.h('img', {
      class: `px-icon ${className}`.trim(),
      src: cached(`bird-url:${frame}`, () => canvas.toDataURL()),
      width: canvas.width * scale,
      height: canvas.height * scale,
      alt: '',
      draggable: 'false',
    });
  }

  function birdFrameUrl(frame) {
    return cached(`bird-url:${frame}`, () => getBirdFrames()[frame].toDataURL());
  }

  WD.sprites = Object.freeze({
    renderMap, getBirdFrames, getIconCanvas, icon, birdImage, birdFrameUrl, COLORS,
  });
})();
