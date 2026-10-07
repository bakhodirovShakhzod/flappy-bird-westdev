/**
 * Builds assets/fonts/west-pixel.ttf — an original 5x7 bitmap-style pixel font.
 *
 * Every "on" pixel of a glyph becomes a square TrueType contour (runs are merged
 * into rectangles). One font pixel = 128 font units, 1 em = 8 font pixels, so the
 * font renders perfectly crisp at 8px, 16px, 24px, 32px ...
 *
 * Run:  node tools/build-font.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = resolve(ROOT, 'assets/fonts/west-pixel.ttf');

const FAMILY = 'West Pixel';
const UNITS_PER_EM = 1024;
const PX = 128;            // font units per pixel
const CAP_ROWS = 7;        // rows above baseline
const ASCENT = 8 * PX;
const DESCENT = 2 * PX;

// Glyph rows: '#' = pixel on. Row 0 is the cap line, rows 7+ sit below the baseline.
const G = {
  ' ': ['...'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  '"': ['#.#', '#.#'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  "'": ['#', '#'],
  '(': ['..#', '.#.', '#..', '#..', '#..', '.#.', '..#'],
  ')': ['#..', '.#.', '..#', '..#', '..#', '.#.', '#..'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..'],
  ',': ['..', '..', '..', '..', '..', '.#', '.#', '#.'],
  '-': ['.....', '.....', '.....', '#####'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ':': ['.', '.', '#', '.', '.', '#'],
  ';': ['..', '..', '.#', '..', '..', '.#', '.#', '#.'],
  '<': ['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'],
  '=': ['.....', '.....', '#####', '.....', '#####'],
  '>': ['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
  'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'I': ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  'J': ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '[': ['###', '#..', '#..', '#..', '#..', '#..', '###'],
  '\\': ['#....', '#....', '.#...', '..#..', '...#.', '....#', '....#'],
  ']': ['###', '..#', '..#', '..#', '..#', '..#', '###'],
  '^': ['..#..', '.#.#.', '#...#'],
  '_': ['.....', '.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '`': ['#.', '.#'],
  'a': ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####'],
  'b': ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
  'c': ['.....', '.....', '.###.', '#....', '#....', '#...#', '.###.'],
  'd': ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  'e': ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  'f': ['..##.', '.#..#', '.#...', '###..', '.#...', '.#...', '.#...'],
  'g': ['.....', '.....', '.####', '#...#', '#...#', '#...#', '.####', '....#', '.###.'],
  'h': ['#....', '#....', '#.##.', '##..#', '#...#', '#...#', '#...#'],
  'i': ['.#.', '...', '##.', '.#.', '.#.', '.#.', '###'],
  'j': ['...#', '....', '..##', '...#', '...#', '...#', '...#', '#..#', '.##.'],
  'k': ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
  'l': ['##.', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  'm': ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#...#', '#...#'],
  'n': ['.....', '.....', '#.##.', '##..#', '#...#', '#...#', '#...#'],
  'o': ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  'p': ['.....', '.....', '####.', '#...#', '#...#', '#...#', '####.', '#....', '#....'],
  'q': ['.....', '.....', '.####', '#...#', '#...#', '#...#', '.####', '....#', '....#'],
  'r': ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  's': ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  't': ['.#...', '.#...', '###..', '.#...', '.#...', '.#..#', '..##.'],
  'u': ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
  'v': ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  'w': ['.....', '.....', '#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
  'x': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  'y': ['.....', '.....', '#...#', '#...#', '#...#', '#...#', '.####', '....#', '.###.'],
  'z': ['.....', '.....', '#####', '...#.', '..#..', '.#...', '#####'],
  '{': ['..##', '.#..', '.#..', '#...', '.#..', '.#..', '..##'],
  '|': ['#', '#', '#', '#', '#', '#', '#'],
  '}': ['##..', '..#.', '..#.', '...#', '..#.', '..#.', '##..'],
  '~': ['.....', '.....', '.#...', '#.#.#', '...#.'],
  '×': ['.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],                    // ×
  '—': ['.......', '.......', '.......', '#######'],                                 // —
  '…': ['.....', '.....', '.....', '.....', '.....', '.....', '#.#.#'],              // …
  '★': ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '##...##'], // ★
  '♥': ['.......', '.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'], // ♥
  '▶': ['#....', '##...', '###..', '####.', '###..', '##...', '#....'],              // ▶
  '◀': ['....#', '...##', '..###', '.####', '..###', '...##', '....#'],              // ◀
};

/* ---------- binary helpers ---------- */
class Bytes {
  constructor() { this.a = []; }
  u8(v) { this.a.push(v & 0xff); return this; }
  u16(v) { return this.u8(v >> 8).u8(v); }
  i16(v) { return this.u16(v < 0 ? v + 0x10000 : v); }
  u32(v) { return this.u16(Math.floor(v / 0x10000) & 0xffff).u16(v & 0xffff); }
  tag(s) { for (const ch of s) this.u8(ch.charCodeAt(0)); return this; }
  bytes(arr) { for (const b of arr) this.u8(b); return this; }
  pad4() { while (this.a.length % 4) this.u8(0); return this; }
  get length() { return this.a.length; }
}

function checksum(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i += 4) {
    sum = (sum + ((arr[i] << 24) | ((arr[i + 1] || 0) << 16) | ((arr[i + 2] || 0) << 8) | (arr[i + 3] || 0))) >>> 0;
  }
  return sum >>> 0;
}

/* ---------- glyph geometry ---------- */
function glyphToRects(rows) {
  const rects = [];
  rows.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      if (row[c] !== '#') { c++; continue; }
      const start = c;
      while (c < row.length && row[c] === '#') c++;
      rects.push({ x0: start * PX, x1: c * PX, y0: (CAP_ROWS - r - 1) * PX, y1: (CAP_ROWS - r) * PX });
    }
  });
  return rects;
}

function buildGlyph(rows) {
  const width = Math.max(...rows.map((r) => r.length));
  const advance = (width + 1) * PX;
  const rects = glyphToRects(rows);
  if (!rects.length) return { advance, data: [], xMin: 0, points: 0, contours: 0, bbox: null };

  // Clockwise contours (TrueType outer contour direction, y-up).
  const pts = [];
  rects.forEach((r) => pts.push([r.x0, r.y0], [r.x0, r.y1], [r.x1, r.y1], [r.x1, r.y0]));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const bbox = { xMin: Math.min(...xs), yMin: Math.min(...ys), xMax: Math.max(...xs), yMax: Math.max(...ys) };

  const b = new Bytes();
  b.i16(rects.length).i16(bbox.xMin).i16(bbox.yMin).i16(bbox.xMax).i16(bbox.yMax);
  rects.forEach((_, i) => b.u16(i * 4 + 3));
  b.u16(0); // instructionLength
  pts.forEach(() => b.u8(0x01)); // on-curve, int16 deltas
  let prev = 0;
  pts.forEach(([x]) => { b.i16(x - prev); prev = x; });
  prev = 0;
  pts.forEach(([, y]) => { b.i16(y - prev); prev = y; });
  while (b.length % 4) b.u8(0);
  return { advance, data: b.a, xMin: bbox.xMin, points: pts.length, contours: rects.length, bbox };
}

/* ---------- font assembly ---------- */
const chars = Object.keys(G).map((ch) => ({ ch, code: ch.codePointAt(0) })).sort((a, b) => a.code - b.code);
const notdef = buildGlyph(['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '#####']);
const glyphs = [notdef, ...chars.map(({ ch }) => buildGlyph(G[ch]))];
const numGlyphs = glyphs.length;

const allBoxes = glyphs.filter((g) => g.bbox).map((g) => g.bbox);
const fontBox = {
  xMin: Math.min(...allBoxes.map((b) => b.xMin)),
  yMin: Math.min(...allBoxes.map((b) => b.yMin)),
  xMax: Math.max(...allBoxes.map((b) => b.xMax)),
  yMax: Math.max(...allBoxes.map((b) => b.yMax)),
};
const maxAdvance = Math.max(...glyphs.map((g) => g.advance));
const avgAdvance = Math.round(glyphs.reduce((s, g) => s + g.advance, 0) / numGlyphs);

// glyf + loca
const glyf = new Bytes();
const loca = new Bytes();
glyphs.forEach((g) => { loca.u32(glyf.length); glyf.bytes(g.data); });
loca.u32(glyf.length);

// head
const head = new Bytes();
head.u32(0x00010000).u32(0x00010000).u32(0).u32(0x5f0f3cf5).u16(0x000b).u16(UNITS_PER_EM)
  .u32(0).u32(0).u32(0).u32(0)
  .i16(fontBox.xMin).i16(fontBox.yMin).i16(fontBox.xMax).i16(fontBox.yMax)
  .u16(0).u16(8).i16(2).i16(1).i16(0);

// hhea
const hhea = new Bytes();
hhea.u32(0x00010000).i16(ASCENT).i16(-DESCENT).i16(0).u16(maxAdvance).i16(0).i16(0).i16(fontBox.xMax)
  .i16(1).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).u16(numGlyphs);

// maxp
const maxp = new Bytes();
maxp.u32(0x00010000).u16(numGlyphs)
  .u16(Math.max(...glyphs.map((g) => g.points))).u16(Math.max(...glyphs.map((g) => g.contours)))
  .u16(0).u16(0).u16(2).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0);

// hmtx
const hmtx = new Bytes();
glyphs.forEach((g) => hmtx.u16(g.advance).i16(g.xMin));

// OS/2 (version 4)
const os2 = new Bytes();
os2.u16(4).i16(avgAdvance).u16(400).u16(5).u16(0)
  .i16(512).i16(512).i16(0).i16(128).i16(512).i16(512).i16(0).i16(384)
  .i16(PX).i16(3 * PX).i16(0)
  .bytes([2, 11, 5, 9, 0, 0, 0, 0, 0, 0])
  .u32(0x00000003).u32((1 << 13) | (1 << 14)).u32(0).u32(0)
  .tag('WDEV').u16(0x0040)
  .u16(chars[0].code).u16(Math.min(chars[chars.length - 1].code, 0xffff))
  .i16(ASCENT).i16(-DESCENT).i16(0).u16(ASCENT).u16(DESCENT)
  .u32(1).u32(0)
  .i16(5 * PX).i16(7 * PX).u16(0).u16(32).u16(1);

// cmap (format 4, one segment per character)
const segs = chars.map(({ code }, i) => ({ start: code, end: code, delta: (i + 1 - code + 0x10000) % 0x10000 }));
segs.push({ start: 0xffff, end: 0xffff, delta: 1 });
const segCount = segs.length;
const searchRange = 2 ** Math.floor(Math.log2(segCount)) * 2;
const sub = new Bytes();
sub.u16(4).u16(16 + segCount * 8).u16(0)
  .u16(segCount * 2).u16(searchRange).u16(Math.log2(searchRange / 2)).u16(segCount * 2 - searchRange);
segs.forEach((s) => sub.u16(s.end));
sub.u16(0);
segs.forEach((s) => sub.u16(s.start));
segs.forEach((s) => sub.u16(s.delta));
segs.forEach(() => sub.u16(0));
const cmap = new Bytes();
cmap.u16(0).u16(1).u16(3).u16(1).u32(12).bytes(sub.a);

// name
const names = [
  [0, 'Original font made for West Dev Flappy Bird'],
  [1, FAMILY], [2, 'Regular'], [3, `${FAMILY} Regular 1.0`], [4, FAMILY],
  [5, 'Version 1.0'], [6, 'WestPixel-Regular'],
];
const nameStrings = new Bytes();
const nameRecords = [];
names.forEach(([id, str]) => {
  const offset = nameStrings.length;
  for (const ch of str) nameStrings.u16(ch.charCodeAt(0));
  nameRecords.push({ id, length: nameStrings.length - offset, offset });
});
const name = new Bytes();
name.u16(0).u16(nameRecords.length).u16(6 + nameRecords.length * 12);
nameRecords.forEach((r) => name.u16(3).u16(1).u16(0x409).u16(r.id).u16(r.length).u16(r.offset));
name.bytes(nameStrings.a);

// post (format 3)
const post = new Bytes();
post.u32(0x00030000).u32(0).i16(-PX).i16(PX).u32(0).u32(0).u32(0).u32(0).u32(0);

/* ---------- sfnt wrapper ---------- */
const tables = { 'OS/2': os2, cmap, glyf, head, hhea, hmtx, loca, maxp, name, post };
const tags = Object.keys(tables).sort();
const numTables = tags.length;
const sr = 2 ** Math.floor(Math.log2(numTables)) * 16;

const font = new Bytes();
font.u32(0x00010000).u16(numTables).u16(sr).u16(Math.log2(sr / 16)).u16(numTables * 16 - sr);
let offset = 12 + numTables * 16;
const layout = tags.map((tag) => {
  const data = tables[tag].a;
  const entry = { tag, data, offset, length: data.length, sum: checksum(data) };
  offset += Math.ceil(data.length / 4) * 4;
  return entry;
});
layout.forEach((t) => font.tag(t.tag).u32(t.sum).u32(t.offset).u32(t.length));
layout.forEach((t) => font.bytes(t.data).pad4());

// checkSumAdjustment
const headEntry = layout.find((t) => t.tag === 'head');
const adjust = (0xb1b0afba - checksum(font.a) + 0x100000000) % 0x100000000;
const pos = headEntry.offset + 8;
font.a[pos] = (adjust >>> 24) & 0xff;
font.a[pos + 1] = (adjust >>> 16) & 0xff;
font.a[pos + 2] = (adjust >>> 8) & 0xff;
font.a[pos + 3] = adjust & 0xff;

mkdirSync(dirname(OUT_FILE), { recursive: true });
const fontBuffer = Buffer.from(font.a);
writeFileSync(OUT_FILE, fontBuffer);
console.log(`Wrote ${OUT_FILE} (${font.length} bytes, ${numGlyphs} glyphs)`);

// Embedded copy: browsers refuse to load fonts over file:// (opaque origin / CORS),
// so a data: URI keeps the pixel font working when index.html is opened by double-click.
const CSS_FILE = resolve(ROOT, 'css/font.css');
writeFileSync(CSS_FILE, `/* Generated by tools/build-font.mjs — do not edit. */
@font-face {
  font-family: 'West Pixel';
  src: url('data:font/ttf;base64,${fontBuffer.toString('base64')}') format('truetype');
  font-display: block;
}
`);
console.log(`Wrote ${CSS_FILE}`);
