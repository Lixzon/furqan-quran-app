/**
 * generate-icons.mjs
 * Generates PWA/app icons as PNGs using only Node built-ins
 * (zlib PNG encoder + a tiny software rasteriser). No image deps.
 *
 * Usage:  npm run icons
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');
const PUBLIC = join(__dirname, '..', 'public');

/* ---------- minimal PNG encoder ---------- */
function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- tiny rasteriser ---------- */
const SS = 2; // supersample
function render(width, height, draw) {
  const px = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / width;
          const v = (y + (sy + 0.5) / SS) / height;
          const c = draw(u, v);
          r += c[0]; g += c[1]; b += c[2]; a += c[3];
        }
      }
      const n = SS * SS;
      const o = (y * width + x) * 4;
      // premultiply-free straight alpha over transparent
      px[o] = Math.round(r / n);
      px[o + 1] = Math.round(g / n);
      px[o + 2] = Math.round(b / n);
      px[o + 3] = Math.round(a / n);
    }
  }
  return px;
}
function inRoundedRect(u, v, x0, y0, x1, y1, r) {
  const cx = Math.max(x0 + r, Math.min(u, x1 - r));
  const cy = Math.max(y0 + r, Math.min(v, y1 - r));
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
}
function inQuad(u, v, ax, ay, bx, by, cx, cy, dx, dy) {
  // point in convex quad via cross products
  const s = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const p = [u, v];
  const pts = [
    [ax, ay], [bx, by], [cx, cy], [dx, dy],
  ];
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const c = s(pts[i], pts[(i + 1) % 4], p);
    if (Math.abs(c) < 1e-9) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}
function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
}

/* ---------- brand art: “The Mihrab of Guidance” ----------
 * Geometry is shared, by hand, with src/components/ui/MihrabLogo.tsx and the
 * SVG assets in public/. All coordinates below are in a 512x512 design space.
 */
const CREAM = hex('#f7f1e3');
const GOLD = hex('#c9a227');
const GOLD_LIGHT = hex('#e3c15a');
const SAPPHIRE = hex('#1e3a8a');

const CANVAS = 512;
const FLOOR_Y = 430;

/** Sample a cubic Bézier into points. */
function cubic(p0, p1, p2, p3, steps = 30) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt ** 3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0];
    const y = mt ** 3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1];
    points.push([x, y]);
  }
  return points;
}

/** Close an arch curve down to the mihrab floor so it forms a fillable polygon. */
function archOutline(curve) {
  return [[curve[0][0], FLOOR_Y], ...curve, [curve[curve.length - 1][0], FLOOR_Y]];
}

const OUTER_POLY = archOutline([
  ...cubic([150, 250], [150, 180], [200, 140], [256, 116]),
  ...cubic([256, 116], [312, 140], [362, 180], [362, 250]),
]);
const INNER_POLY = archOutline([
  ...cubic([186, 258], [186, 206], [216, 176], [256, 158]),
  ...cubic([256, 158], [296, 176], [326, 206], [326, 258]),
]);
// The fine inner line: the inner arch pulled slightly toward its centre.
const INNER_LINE = INNER_POLY.map(([x, y]) => [256 + (x - 256) * 0.9, 300 + (y - 300) * 0.9]);

function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function over(fg, bg) {
  const a = fg[3] / 255;
  return [
    Math.round(fg[0] * a + bg[0] * (1 - a)),
    Math.round(fg[1] * a + bg[1] * (1 - a)),
    Math.round(fg[2] * a + bg[2] * (1 - a)),
    Math.round(255 * (a + (bg[3] / 255) * (1 - a))),
  ];
}

/** Paints the mark (arch, Qur'an, Nur) at a point already in 512-space. */
function paintMark(x, y, color) {
  // Nur: soft halo, then the tapered shaft dissolving upward.
  if (inQuad(x, y, 230, 374, 282, 374, 272, 138, 240, 138)) {
    const t = Math.max(0, Math.min(1, (374 - y) / (374 - 138)));
    color = over([GOLD_LIGHT[0], GOLD_LIGHT[1], GOLD_LIGHT[2], 0.16 * (1 - t) * 255], color);
  }
  if (inQuad(x, y, 244, 374, 268, 374, 266, 138, 246, 138)) {
    const t = Math.max(0, Math.min(1, (374 - y) / (374 - 138)));
    color = over([GOLD_LIGHT[0], GOLD_LIGHT[1], GOLD_LIGHT[2], 0.55 * (1 - t) * 255], color);
  }

  // Mihrab arch: the band between the outer and inner outlines, plus a fine inner line.
  const inOuter = inPolygon(x, y, OUTER_POLY);
  const inInner = inPolygon(x, y, INNER_POLY);
  if (inOuter && !inInner) {
    color = over([...GOLD, 255], color);
  } else if (inInner && !inPolygon(x, y, INNER_LINE)) {
    color = over([...GOLD, 0.4 * 255], color);
  }

  // Floor of the mihrab.
  if (y >= FLOOR_Y - 6 && y <= FLOOR_Y + 6 && x >= 132 && x <= 380) color = over([...GOLD, 255], color);

  // Open Qur'an resting on the floor.
  const leftPage = inQuad(x, y, 256, 372, 168, 354, 168, 402, 256, 420);
  const rightPage = inQuad(x, y, 256, 372, 344, 354, 344, 402, 256, 420);
  if (leftPage || rightPage) color = over([...SAPPHIRE, 255], color);
  if (x >= 253 && x <= 259 && y >= 374 && y <= 420) color = over([...CREAM, 0.85 * 255], color);

  return color;
}

/** App icon: warm cream tile with the mark centred inside it. */
function makeIconDraw(markScale, cornerRadius) {
  return (u, v) => {
    const cx = u * CANVAS;
    const cy = v * CANVAS;
    if (cornerRadius > 0) {
      const nx = Math.max(cornerRadius, Math.min(cx, CANVAS - cornerRadius));
      const ny = Math.max(cornerRadius, Math.min(cy, CANVAS - cornerRadius));
      if ((cx - nx) ** 2 + (cy - ny) ** 2 > cornerRadius ** 2) return [0, 0, 0, 0];
    }
    const x = (cx - 256) / markScale + 256;
    const y = (cy - 256) / markScale + 256;
    return paintMark(x, y, [...CREAM, 255]);
  };
}

/* ---------- 5x7 bitmap wordmark (share cards) ---------- */
const FONT = {
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
};

function inText(x, y, text, originX, originY, scale, tracking) {
  let cursor = originX;
  for (const character of text) {
    const glyph = FONT[character];
    if (glyph) {
      for (let row = 0; row < glyph.length; row++) {
        for (let col = 0; col < glyph[row].length; col++) {
          if (glyph[row][col] !== '1') continue;
          const gx = cursor + col * scale;
          const gy = originY + row * scale;
          if (x >= gx && x < gx + scale && y >= gy && y < gy + scale) return true;
        }
      }
    }
    cursor += 5 * scale + tracking;
  }
  return false;
}

/** 1200x630 share card: the mark above the wordmark. */
function makeOgDraw() {
  const markScale = 1.15;
  const markCentreX = 600;
  // Screen y where the design-space origin (y = 256) lands, chosen so the arch
  // apex (design y = 116) clears the top edge instead of being cut off.
  const markTop = 221;
  const wordScale = 11;
  const wordTracking = 18;
  const wordWidth = 6 * (5 * wordScale) + 5 * wordTracking;
  return (u, v) => {
    const x = u * 1200;
    const y = v * 630;
    let color = [...CREAM, 255];
    color = paintMark((x - markCentreX) / markScale + 256, (y - markTop) / markScale + 256, color);
    if (inText(x, y, 'FURQAN', 600 - wordWidth / 2, 470, wordScale, wordTracking)) {
      color = over([...GOLD, 255], color);
    }
    return color;
  };
}

/* ---------- ICO container (PNG payload, supported by all modern browsers) ---------- */
function encodeIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
}

async function run() {
  await mkdir(OUT, { recursive: true });
  await mkdir(PUBLIC, { recursive: true });

  const jobs = [
    // Mark occupies ~86% of a rounded tile for standard icons; maskable icons
    // keep the whole mark inside Android's 80% safe circle (so the mark is
    // drawn near 1:1 and the tile bleeds to the edges).
    ['icon-192.png', 192, { markScale: 0.86, cornerRadius: 42 }],
    ['icon-512.png', 512, { markScale: 0.86, cornerRadius: 112 }],
    ['maskable-192.png', 192, { markScale: 0.95, cornerRadius: 0 }],
    ['maskable-512.png', 512, { markScale: 0.95, cornerRadius: 0 }],
    // iOS applies its own mask, so ship a full-bleed square.
    ['apple-touch-icon.png', 180, { markScale: 0.86, cornerRadius: 0 }],
  ];

  for (const [name, size, options] of jobs) {
    const px = render(size, size, makeIconDraw(options.markScale, options.cornerRadius));
    await writeFile(join(OUT, name), encodePng(size, size, px));
    console.log(`wrote ${name} (${size}x${size})`);
  }

  // Classic favicon for browsers that ignore the SVG one.
  const icoPng = encodePng(32, 32, render(32, 32, makeIconDraw(0.9, 6)));
  await writeFile(join(PUBLIC, 'favicon.ico'), encodeIco(icoPng, 32));
  console.log('wrote favicon.ico (32x32)');

  // Open Graph / share card.
  await writeFile(join(PUBLIC, 'og-image.png'), encodePng(1200, 630, render(1200, 630, makeOgDraw())));
  console.log('wrote og-image.png (1200x630)');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
