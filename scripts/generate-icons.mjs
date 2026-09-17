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
function render(size, draw) {
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const c = draw(u, v);
          r += c[0]; g += c[1]; b += c[2]; a += c[3];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
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

/* ---------- icon art ---------- */
const TEAL_TOP = hex('#0f9d8f');
const TEAL_BOT = hex('#0a6b61');
const WHITE = [255, 255, 255, 255];
const TEAL = hex('#0d9488');
const GOLD = hex('#e3b341');

/**
 * @param motifScale how much of the canvas the open book occupies (0..1)
 */
function makeDraw(motifScale, maskable) {
  return (u, v) => {
    // full-bleed rounded-square background (rounded only when not maskable)
    if (!inRoundedRect(u, v, 0, 0, 1, 1, maskable ? 0 : 0.22)) return [0, 0, 0, 0];
    const t = v;
    const bg = [
      Math.round(TEAL_TOP[0] + (TEAL_BOT[0] - TEAL_TOP[0]) * t),
      Math.round(TEAL_TOP[1] + (TEAL_BOT[1] - TEAL_TOP[1]) * t),
      Math.round(TEAL_TOP[2] + (TEAL_BOT[2] - TEAL_TOP[2]) * t),
      255,
    ];

    const cx = 0.5;
    const s = motifScale;
    const half = (s / 2) * 0.82; // page half-width
    const top = 0.5 - s * 0.36;
    const bottom = 0.5 + s * 0.4;
    const innerDip = top + s * 0.06; // where the spine gutter curves
    const gutter = s * 0.012;

    // left page quad (white)
    const left = inQuad(u, v,
      cx - half, top + s * 0.03,
      cx - gutter, innerDip,
      cx - gutter, bottom - s * 0.03,
      cx - half, bottom + s * 0.02,
    );
    const right = inQuad(u, v,
      cx + half, top + s * 0.03,
      cx + gutter, innerDip,
      cx + gutter, bottom - s * 0.03,
      cx + half, bottom + s * 0.02,
    );
    if (left || right) {
      // horizontal "text line" grooves on each page
      let lineColor = null;
      for (let k = 0; k < 3; k++) {
        const ly = innerDip + s * 0.05 + k * s * 0.085;
        if (left && u > cx - half + s * 0.05 && u < cx - gutter - s * 0.01 && v > ly - s * 0.006 && v < ly + s * 0.006) {
          lineColor = [0, 0, 0, 0];
        }
        if (right && u > cx + gutter + s * 0.01 && u < cx + half - s * 0.05 && v > ly - s * 0.006 && v < ly + s * 0.006) {
          lineColor = [0, 0, 0, 0];
        }
      }
      return [WHITE[0], WHITE[1], WHITE[2], WHITE[3]]; // pages stay white; grooves skipped for simplicity
    }
    return bg;
  };
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const jobs = [
    ['icon-192.png', 192, 0.8, false],
    ['icon-512.png', 512, 0.8, false],
    ['maskable-512.png', 512, 0.58, true],
    ['apple-touch-icon.png', 180, 0.8, false],
  ];
  for (const [name, size, scale, maskable] of jobs) {
    const draw = makeDraw(scale, maskable);
    const px = render(size, draw);
    await writeFile(join(OUT, name), encodePng(size, size, px));
    console.log(`wrote ${name} (${size}x${size})`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
