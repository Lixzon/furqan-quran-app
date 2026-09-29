/**
 * Generate per-surah timing metadata for reciters that are matched to Quran.com.
 * Output: public/data/timing/{reciterId}/{surah}.json
 * Each file contains { reciterId, surah, audioUrl, timestamps: [{ start, end }] }
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_ROOT = join(ROOT, 'public', 'data', 'timing');
const API = 'https://api.quran.com/api/v4';

const RECITERS = [
  { id: 'ar.alafasy', label: 'Mishary Rashid Alafasy', names: ['Mishari Rashid al-`Afasy', 'Mishary Rashid al-Afasy', 'Mishary Rashid Alafasy', 'Mishari Rashid Alafasy'] },
  { id: 'ar.abdulbasitmurattal', label: 'Abdul Basit (Murattal)', names: ['AbdulBaset AbdulSamad', 'Abdul Basit Abdul Samad', 'Abdul Basit', 'AbdulBaset AbdulSamad'] },
  { id: 'ar.abdurrahmaansudais', label: 'Abdur-Rahman As-Sudais', names: ['Abdur-Rahman as-Sudais', 'Abdur Rahman As-Sudais', 'Abdur-Rahman as-Sudais'] },
  { id: 'ar.saudalshuraym', label: 'Saud Ash-Shuraym', names: ['Sa`ud ash-Shuraym', 'Saud ash-Shuraym', 'Saud Ash-Shuraym'] },
  { id: 'ar.saadghamdi', label: 'Saad Al-Ghamdi', names: ['Saad al-Ghamdi', 'Saad Al-Ghamdi'] },
  { id: 'ar.mahermuaiqly', label: 'Maher Al-Muaiqly', names: ['Maher Al-Muaiqly', 'Maher al-Muaiqly', 'Maher al Muaiqly'] },
  { id: 'ar.husary', label: 'Mahmoud Khalil Al-Husary', names: ['Mahmoud Khalil Al-Husary', 'Mahmoud Khalil Al Husary'] },
  { id: 'ar.minshawi', label: 'Muhammad Siddiq Al-Minshawi', names: ['Mohamed Siddiq al-Minshawi', 'Muhammad Siddiq Al-Minshawi', 'Mohamed Siddiq al-Minshawi'] },
  { id: 'ar.muhammadayyoub', label: 'Muhammad Ayyub', names: ['Muhammad Ayyub'] },
  { id: 'ar.hanirifai', label: 'Hani Ar-Rifai', names: ['Hani ar-Rifai', 'Hani Ar-Rifai'] },
  { id: 'ar.muhammadjibreel', label: 'Muhammad Jibreel', names: ['Muhammad Jibreel'] },
];

async function fetchJson(url, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      if (attempt === tries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  }
}

function normalizeReciterName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

async function findReciterId(label, names) {
  const dry = await fetchJson(`${API}/resources/recitations`);
  const all = dry.recitations ?? [];
  const canonical = new Set(names.map(normalizeReciterName));
  const match = all.find((item) => {
    const reciterName = normalizeReciterName(item.reciter_name ?? '');
    const translated = normalizeReciterName(item.translated_name?.name ?? '');
    return canonical.has(reciterName) || canonical.has(translated);
  });
  return match ? Number(match.id) : null;
}

function buildAudioUrl(reciterId, chapterNumber, fileName) {
  const base = `https://download.quranicaudio.com/quran`;
  return `${base}/${reciterId}/${fileName}`;
}

/**
 * Per-ayah timings for one chapter.
 *
 * Quran.com exposes them on the chapter-recitation endpoint:
 *   GET /chapter_recitations/{reciterId}/{chapter}?segments=true
 *   → { audio_file: { audio_url, timestamps: [{ verse_key, timestamp_from, timestamp_to }] } }
 * where the times are milliseconds from the start of that audio file.
 *
 * The old code called /recitations/{id}/by_chapter/{n}, which only returns
 * { verse_key, url } pairs with no timings at all — so every chapter was
 * skipped and public/data/timing/ stayed empty, leaving the app on its
 * proportional fallback. Times are written in SECONDS because
 * HTMLAudioElement.currentTime is compared against them directly.
 */
async function fetchChapterTimestamps(reciterId, chapterNumber) {
  const data = await fetchJson(`${API}/chapter_recitations/${reciterId}/${chapterNumber}?segments=true`);
  const file = data.audio_file ?? {};
  const rows = Array.isArray(file.timestamps) ? file.timestamps : [];

  const timestamps = rows
    .slice()
    .sort((a, b) => (Number(a.timestamp_from) || 0) - (Number(b.timestamp_from) || 0))
    .map((row) => ({
      start: (Number(row.timestamp_from) || 0) / 1000,
      end: (Number(row.timestamp_to) || 0) / 1000,
    }))
    .filter((segment) => segment.end > segment.start);

  return {
    chapter: chapterNumber,
    reciterId,
    audioUrl: typeof file.audio_url === 'string' ? file.audio_url : null,
    timestamps,
  };
}

async function run() {
  await mkdir(OUT_ROOT, { recursive: true });
  const known = [];
  const unmatched = [];

  for (const item of RECITERS) {
    const reciterId = await findReciterId(item.label, item.names);
    if (!reciterId) {
      unmatched.push(item.id);
      console.log(`MATCH: ${item.id} -> not found`);
      continue;
    }
    known.push({ id: item.id, quranId: reciterId, label: item.label });
    console.log(`MATCH: ${item.id} -> quran.com id ${reciterId}`);

    const dir = join(OUT_ROOT, item.id);
    await mkdir(dir, { recursive: true });

    for (let surah = 1; surah <= 114; surah++) {
      try {
        const chapter = await fetchChapterTimestamps(reciterId, surah);
        if (chapter.timestamps.length === 0) {
          console.log(`SKIP: ${item.id} surah ${surah} — Quran.com exposed no timings for this chapter.`);
          continue;
        }

        const payload = {
          reciterId: item.id,
          surah,
          audioUrl: chapter.audioUrl,
          // Last boundary = file length; the player checks it against the
          // duration it actually loaded before trusting these boundaries.
          durationSeconds: chapter.timestamps[chapter.timestamps.length - 1].end,
          timestamps: chapter.timestamps,
        };

        const file = join(dir, `${surah}.json`);
        await writeFile(file, JSON.stringify(payload, null, 2));
      } catch (error) {
        console.warn(`WARN: ${item.id} surah ${surah} failed: ${error.message}`);
      }
    }
  }

  console.log('\nMatched reciters:', known.map((r) => `${r.id}=${r.quranId}`).join(', ') || 'none');
  console.log('Unmatched reciters:', unmatched.length ? unmatched.join(', ') : 'none');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
