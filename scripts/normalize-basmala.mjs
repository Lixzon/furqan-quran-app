/**
 * normalize-basmala.mjs
 * The Al Quran Cloud Uthmani text embeds the Basmala at the start of ayah 1
 * for every surah except 1 & 9. The reader renders its own ornamental Basmala
 * header, so this strips the embedded one from each bundled surah file using
 * diacritic-insensitive matching.
 *
 * Usage: node scripts/normalize-basmala.mjs
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'public', 'data', 'surah');

const RAW_BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

function normalize(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
    .replace(/\u0671/g, '\u0627')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function stripBasmala(text, surah) {
  if (surah === 1 || surah === 9) return { text, present: false };
  const t = text.replace(/\u00a0/g, ' ').trim();
  const maybe = t.slice(0, RAW_BASMALA.length);
  if (normalize(maybe) === normalize(RAW_BASMALA)) {
    return { text: t.slice(RAW_BASMALA.length).trim(), present: true };
  }
  return { text, present: false };
}

async function run() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.json'));
  let stripped = 0;
  for (const file of files) {
    const surah = JSON.parse(await readFile(join(DIR, file), 'utf8'));
    if (!surah.ayahs || surah.ayahs.length === 0) continue;
    const res = stripBasmala(surah.ayahs[0].ar, surah.number);
    if (res.present) {
      surah.ayahs[0].ar = res.text;
      surah.hasBasmalaPrefix = false;
      stripped++;
      await writeFile(join(DIR, file), JSON.stringify(surah));
    }
  }
  console.log(`Checked ${files.length} surah files; stripped Basmala from ${stripped} first-ayah texts.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
