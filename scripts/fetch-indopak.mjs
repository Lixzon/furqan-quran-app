import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const META_FILE = join(ROOT, 'public', 'data', 'meta', 'surahs.json');
const OUT_DIR = join(ROOT, 'public', 'data', 'indopak');
const API = 'https://api.quran.com/api/v4/quran/verses/indopak?chapter_number=';

async function fetchSurah(meta) {
  const response = await fetch(`${API}${meta.number}`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Surah ${meta.number}: HTTP ${response.status}`);
  const payload = await response.json();
  const verses = payload.verses;
  if (!Array.isArray(verses) || verses.length !== meta.numberOfAyahs) {
    throw new Error(`Surah ${meta.number}: expected ${meta.numberOfAyahs} IndoPak ayahs, received ${verses?.length ?? 0}`);
  }
  return {
    surah: meta.number,
    ayahs: verses.map((verse, index) => ({
      ayah: Number(verse.verse_key?.split(':')[1]) || index + 1,
      text: String(verse.text_indopak ?? '').trim(),
    })),
  };
}

async function main() {
  const surahs = JSON.parse(await readFile(META_FILE, 'utf8'));
  await mkdir(OUT_DIR, { recursive: true });
  let cursor = 0;
  const workers = Array.from({ length: 5 }, async () => {
    while (cursor < surahs.length) {
      const meta = surahs[cursor++];
      const data = await fetchSurah(meta);
      await writeFile(join(OUT_DIR, `${meta.number}.json`), JSON.stringify(data));
      process.stdout.write(`IndoPak ${meta.number}/114 saved\n`);
    }
  });
  await Promise.all(workers);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});