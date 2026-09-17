/**
 * fetch-fonts.mjs
 * Downloads self-hosted Arabic fonts so the app is fully offline-capable.
 * If a download fails the app falls back to system Arabic fonts, so a
 * failure here is non-fatal.
 *
 * Usage:  npm run data:fonts
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'fonts');

const FONTS = [
  {
    name: 'AmiriQuran-Regular.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/amiriquran/AmiriQuran-Regular.ttf',
    label: 'Amiri Quran (Uthmani-style)',
  },
  {
    name: 'NotoNaskhArabic.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/notonaskharabic/NotoNaskhArabic%5Bwght%5D.ttf',
    label: 'Noto Naskh Arabic (clear Naskh)',
  },
  {
    name: 'ScheherazadeNew.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/scheherazadenew/ScheherazadeNew-Regular.ttf',
    label: 'Scheherazade New (traditional Naskh)',
  },
];

async function run() {
  await mkdir(OUT, { recursive: true });
  for (const f of FONTS) {
    try {
      const res = await fetch(f.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(join(OUT, f.name), buf);
      console.log(`ok  ${f.name}  (${(buf.length / 1024 / 1024).toFixed(2)} MB) — ${f.label}`);
    } catch (err) {
      console.warn(`skip ${f.name} (${f.label}): ${err.message} — will use system fallback`);
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
