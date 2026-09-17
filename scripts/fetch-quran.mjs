/**
 * fetch-quran.mjs
 * Downloads the full Quran from the Al Quran Cloud API and bundles it locally:
 *   - Arabic text      (quran-uthmani)
 *   - Translation      (en.sahih)
 *   - Transliteration  (en.transliteration)
 * plus Surah metadata and Juz (Para) boundaries.
 *
 * Output (all static, served from /data/... and cached offline):
 *   public/data/surah/1.json .. 114.json   (per-surah combined)
 *   public/data/meta/surahs.json
 *   public/data/meta/juz.json
 *
 * Usage:  npm run data:fetch
 */
import { writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_SURAH = join(ROOT, 'public', 'data', 'surah');
const OUT_META = join(ROOT, 'public', 'data', 'meta');

const API = 'https://api.alquran.cloud/v1';
const ARABIC = 'quran-uthmani';
const TRANS = 'en.sahih';
const TRANSLIT = 'en.transliteration';

// Normalise the Basmala so we can strip a leading one from ayah 1 when present.
const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const BASMALA_ALT = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

async function fetchJson(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.code !== 200 || json.status !== 'OK') throw new Error(`API error: ${JSON.stringify(json).slice(0, 200)}`);
      return json.data;
    } catch (err) {
      if (i === tries) throw err;
      await new Promise((r) => setTimeout(r, 1200 * i));
    }
  }
}

function stripLeadingBasmala(text, surah) {
  // Surah 1 counts the Basmala as ayah 1; surah 9 has no Basmala.
  if (surah === 1 || surah === 9) return text;
  const t = text.replace(/\u00a0/g, ' ').trim();
  if (t.startsWith(BASMALA)) return t.slice(BASMALA.length).trim();
  if (t.startsWith(BASMALA_ALT)) return t.slice(BASMALA_ALT.length).trim();
  return text;
}

function bismillahPresent(text) {
  const t = text.replace(/\u00a0/g, ' ').trim();
  return t.startsWith(BASMALA) || t.startsWith(BASMALA_ALT);
}

async function downloadSurah(n) {
  const data = await fetchJson(`${API}/surah/${n}/editions/${ARABIC},${TRANS},${TRANSLIT}`);
  // data is an array of 3 edition blocks (each with surah info at the top level)
  // in request order: Arabic, translation, transliteration.
  const byName = {};
  for (const ed of data) byName[ed.edition?.identifier] = ed;
  const ar = byName[ARABIC];
  const tr = byName[TRANS];
  const tl = byName[TRANSLIT];
  if (!ar || !tr || !tl) throw new Error(`Missing edition for surah ${n}`);

  const hasBasmalaPrefix = ar.ayahs.length > 0 && bismillahPresent(ar.ayahs[0].text) && n !== 1 && n !== 9;

  const ayahs = ar.ayahs.map((a, idx) => {
    const translation = tr.ayahs[idx];
    const translit = tl.ayahs[idx];
    return {
      g: a.number, // global ayah number across the whole Quran
      i: a.numberInSurah, // number within the surah
      ar: stripLeadingBasmala(a.text, n),
      tr: translation ? translation.text : '',
      tl: translit ? translit.text : '',
    };
  });

  return {
    number: n,
    name: ar.name,
    englishName: ar.englishName,
    englishNameTranslation: ar.englishNameTranslation,
    revelationType: ar.revelationType,
    numberOfAyahs: ar.numberOfAyahs,
    hasBasmalaPrefix,
    ayahs,
  };
}

async function downloadSurahList() {
  const data = await fetchJson(`${API}/surah`);
  return data.map((s) => ({
    number: s.number,
    name: s.name,
    englishName: s.englishName,
    englishNameTranslation: s.englishNameTranslation,
    revelationType: s.revelationType,
    numberOfAyahs: s.numberOfAyahs,
  }));
}

async function downloadJuz() {
  const juz = [];
  for (let j = 1; j <= 30; j++) {
    const data = await fetchJson(`${API}/juz/${j}`);
    const ayahs = data.ayahs;
    const first = ayahs[0];
    const last = ayahs[ayahs.length - 1];
    juz.push({
      juz: j,
      startSurah: first.surah.number,
      startAyah: first.numberInSurah,
      endSurah: last.surah.number,
      endAyah: last.numberInSurah,
    });
    process.stdout.write(`juz ${j}/30 done\n`);
  }
  return juz;
}

async function run() {
  await mkdir(OUT_SURAH, { recursive: true });
  await mkdir(OUT_META, { recursive: true });

  console.log('Downloading surah list + juz boundaries…');
  const [surahs, juz] = await Promise.all([downloadSurahList(), downloadJuz()]);
  await writeFile(join(OUT_META, 'surahs.json'), JSON.stringify(surahs));
  await writeFile(join(OUT_META, 'juz.json'), JSON.stringify(juz));
  console.log(`meta written: ${surahs.length} surahs, ${juz.length} juz`);

  const order = surahs.map((s) => s.number);
  console.log('Downloading per-surah text/translation/transliteration…');

  // Limited concurrency to be gentle on the API.
  const concurrency = 5;
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < order.length) {
      const n = order[cursor++];
      try {
        const surah = await downloadSurah(n);
        const file = join(OUT_SURAH, `${n}.json`);
        const tmp = `${file}.tmp`;
        await writeFile(tmp, JSON.stringify(surah));
        await rename(tmp, file);
        process.stdout.write(`surah ${n}/114 ok (${surah.numberOfAyahs} ayahs)\n`);
      } catch (err) {
        console.error(`surah ${n} FAILED: ${err.message}`);
      }
    }
  });
  await Promise.all(workers);
  console.log('Done. Bundled data is under public/data/.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
