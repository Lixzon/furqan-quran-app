import { audioStreamUrl } from './constants';
import { db } from '../db/database';

const TIMING_DATA_PATH = '/data/timing';
const QURAN_COM_API = 'https://api.quran.com/api/v4';
const API_TIMEOUT_MS = 12_000;

/** Quran.com recitation IDs whose audio matches one of Furqan's reciter options. */
const QURAN_COM_RECITATION_IDS: Record<string, number> = {
  'ar.alafasy': 7,
  'ar.abdulbasitmurattal': 2,
  'ar.abdurrahmaansudais': 3,
  'ar.saudalshuraym': 10,
  'ar.husary': 6,
  'ar.minshawi': 9,
  'ar.hanirifai': 5,
};

export interface TimingSegment {
  start: number;
  end: number;
}

export interface SurahTimingData {
  reciterId: string;
  surah: number;
  audioUrl: string | null;
  timestamps: TimingSegment[];
}

interface QuranComTimestamp {
  verse_key?: unknown;
  timestamp_from?: unknown;
  timestamp_to?: unknown;
}

const timingCache = new Map<string, SurahTimingData | null>();
const pendingTiming = new Map<string, Promise<SurahTimingData | null>>();
const retryAfter = new Map<string, number>();

function normalizeAudioUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' || url.hostname !== 'download.quranicaudio.com') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validTimingData(value: unknown, reciter: string, surah: number): SurahTimingData | null {
  if (!isRecord(value) || value.reciterId !== reciter || value.surah !== surah) return null;
  if (!Array.isArray(value.timestamps) || value.timestamps.length === 0) return null;

  const timestamps: TimingSegment[] = [];
  let previousStart = -1;
  let previousEnd = -1;
  for (const raw of value.timestamps) {
    if (!isRecord(raw)) return null;
    if (typeof raw.start !== 'number' || typeof raw.end !== 'number') return null;
    const start = Number(raw.start);
    const end = Number(raw.end);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end <= start ||
      start < previousStart ||
      end < previousEnd
    ) {
      return null;
    }
    timestamps.push({ start, end });
    previousStart = start;
    previousEnd = end;
  }

  return {
    reciterId: reciter,
    surah,
    audioUrl: normalizeAudioUrl(typeof value.audioUrl === 'string' ? value.audioUrl : null),
    timestamps,
  };
}

function parseQuranComTimestamps(
  rows: unknown,
  reciter: string,
  surah: number,
  audioUrl: unknown,
): SurahTimingData | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const timestamps: TimingSegment[] = [];
  let previousEnd = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as QuranComTimestamp;
    if (typeof row?.timestamp_from !== 'number' || typeof row.timestamp_to !== 'number') return null;
    const startMs = Number(row?.timestamp_from);
    const endMs = Number(row?.timestamp_to);
    if (
      row?.verse_key !== `${surah}:${index + 1}` ||
      !Number.isFinite(startMs) ||
      !Number.isFinite(endMs) ||
      startMs < 0 ||
      endMs <= startMs ||
      startMs < previousEnd - 100
    ) {
      return null;
    }

    timestamps.push({ start: startMs / 1000, end: endMs / 1000 });
    previousEnd = endMs;
  }

  const normalizedAudioUrl = normalizeAudioUrl(typeof audioUrl === 'string' ? audioUrl : null);
  if (!normalizedAudioUrl) return null;
  return { reciterId: reciter, surah, audioUrl: normalizedAudioUrl, timestamps };
}

async function readCachedTiming(key: string, reciter: string, surah: number): Promise<SurahTimingData | null> {
  try {
    const cached = await db.cachedJson.get(key);
    if (!cached) return null;
    const timing = validTimingData(JSON.parse(cached.body) as unknown, reciter, surah);
    if (timing) return timing;
    await db.cachedJson.delete(key);
  } catch (error) {
    console.warn('[audio timing] could not read cached verse timings:', error);
  }
  return null;
}

async function storeCachedTiming(key: string, timing: SurahTimingData): Promise<void> {
  try {
    await db.cachedJson.put({ url: key, body: JSON.stringify(timing), cachedAt: Date.now() });
  } catch (error) {
    console.warn('[audio timing] could not save verse timings for offline use:', error);
  }
}

async function fetchQuranComTiming(reciter: string, surah: number): Promise<SurahTimingData | null> {
  const recitationId = QURAN_COM_RECITATION_IDS[reciter];
  if (!recitationId) return null;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${QURAN_COM_API}/chapter_recitations/${recitationId}/${surah}?segments=true`,
      {
        cache: 'force-cache',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      },
    );
    if (!response.ok) throw new Error(`Quran.com returned HTTP ${response.status}`);
    const payload: unknown = await response.json();
    if (!isRecord(payload) || !isRecord(payload.audio_file)) return null;

    const file = payload.audio_file;
    return parseQuranComTimestamps(file.timestamps, reciter, surah, file.audio_url);
  } finally {
    window.clearTimeout(timeout);
  }
}

async function loadTiming(reciter: string, surah: number): Promise<SurahTimingData | null> {
  const key = `${reciter}|${surah}`;

  try {
    const response = await fetch(
      `${TIMING_DATA_PATH}/${encodeURIComponent(reciter)}/${surah}.json`,
      { cache: 'force-cache' },
    );
    if (response.ok) {
      const local = validTimingData(await response.json() as unknown, reciter, surah);
      if (local) return local;
      console.warn(`[audio timing] invalid bundled timings for ${reciter} surah ${surah}`);
    }
  } catch {
    // The local timing file is optional; try the on-device cache and API next.
  }

  const cached = await readCachedTiming(`timing:${key}`, reciter, surah);
  if (cached) return cached;

  try {
    const remote = await fetchQuranComTiming(reciter, surah);
    if (remote) {
      await storeCachedTiming(`timing:${key}`, remote);
      return remote;
    }
    console.warn(`[audio timing] no verified verse timings for ${reciter} surah ${surah}`);
  } catch (error) {
    console.warn(`[audio timing] unable to load precise timings for ${reciter} surah ${surah}:`, error);
  }
  return null;
}

export async function getSurahTimingData(reciter: string, surah: number): Promise<SurahTimingData | null> {
  const key = `${reciter}|${surah}`;
  if (timingCache.has(key)) return timingCache.get(key) ?? null;

  const retryAt = retryAfter.get(key) ?? 0;
  if (retryAt > Date.now()) return null;

  const pending = pendingTiming.get(key);
  if (pending) return pending;

  const request = loadTiming(reciter, surah)
    .then((timing) => {
      if (timing) timingCache.set(key, timing);
      else if (!QURAN_COM_RECITATION_IDS[reciter]) timingCache.set(key, null);
      else retryAfter.set(key, Date.now() + 60_000);
      return timing;
    })
    .finally(() => pendingTiming.delete(key));
  pendingTiming.set(key, request);
  return request;
}

export async function resolveAudioSourceUrl(reciter: string, surah: number): Promise<string> {
  const timing = await getSurahTimingData(reciter, surah);
  return timing?.audioUrl ?? audioStreamUrl(reciter, surah);
}
