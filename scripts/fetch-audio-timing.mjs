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

async function fetchChapterTimestamps(reciterId, chapterNumber) {
  const endpoints = [
    `${API}/recitations/${reciterId}/by_chapter/${chapterNumber}?segments=true`,
    `${API}/recitations/${reciterId}/by_chapter/${chapterNumber}`,
  ];

  for (const url of endpoints) {
    try {
      const data = await fetchJson(url);
      const audioFiles = data.audio_files ?? [];
      const timestamps = [];

      for (const file of audioFiles) {
        if (!file || !file.verse_key) continue;
        const start = Number(file.timestamp_from ?? file.start ?? file.timestamp_start ?? file.start_time);
        const end = Number(file.timestamp_to ?? file.end ?? file.timestamp_end ?? file.end_time);
        if (Number.isFinite(start) || Number.isFinite(end)) {
          timestamps.push({
            start: Number.isFinite(start) ? start : 0,
            end: Number.isFinite(end) ? end : (Number.isFinite(start) ? start : 0),
          });
        }
      }

      if (timestamps.length > 0) {
        return {
          chapter: chapterNumber,
          reciterId,
          audioFiles,
          timestamps,
        };
      }
    } catch {
      // continue to the next candidate endpoint if this shape is unavailable
    }
  }

  return {
    chapter: chapterNumber,
    reciterId,
    audioFiles: [],
    timestamps: [],
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
          console.log(`SKIP: ${item.id} surah ${surah} — no timestamp payload exposed by Quran.com in this environment.`);
          continue;
        }

        const audioUrl = Array.isArray(chapter.audioFiles) && chapter.audioFiles[0]?.url
          ? (() => {
              const raw = chapter.audioFiles[0].url;
              if (/^https?:\/\//i.test(raw)) return raw;
              return raw.startsWith('/') ? `https://download.quranicaudio.com${raw}` : `https://download.quranicaudio.com/quran/${raw}`;
            })()
          : null;

        const payload = {
          reciterId: item.id,
          surah,
          audioUrl,
          timestamps: chapter.timestamps.map((segment) => ({ start: Number(segment.start), end: Number(segment.end) })),
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
