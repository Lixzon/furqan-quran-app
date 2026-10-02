import type { JuzBoundary, SurahFull, SurahMeta } from '../types';
import { countStoredQuranSurahs, getStoredIndoPakSurah, getStoredUthmaniSurah, storeIndoPakSurah, storeUthmaniSurah, type IndoPakSurah } from './quranDb';

/** Simple in-memory + session fetch layer over the bundled static data in /public/data. */

const metaCache: { surahs?: SurahMeta[]; juz?: JuzBoundary[] } = {};
const surahCache = new Map<number, SurahFull>();
const surahPending = new Map<number, Promise<SurahFull>>();
const indoPakPending = new Map<number, Promise<IndoPakSurah>>();

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return (await res.json()) as T;
}

export async function getSurahMetaList(): Promise<SurahMeta[]> {
  if (metaCache.surahs) return metaCache.surahs;
  const data = await fetchJson<SurahMeta[]>('/data/meta/surahs.json');
  metaCache.surahs = data;
  return data;
}

export async function getJuzList(): Promise<JuzBoundary[]> {
  if (metaCache.juz) return metaCache.juz;
  const data = await fetchJson<JuzBoundary[]>('/data/meta/juz.json');
  metaCache.juz = data;
  return data;
}

export async function getSurah(number: number): Promise<SurahFull> {
  if (surahCache.has(number)) return surahCache.get(number) as SurahFull;
  const pending = surahPending.get(number);
  if (pending) return pending;
  const task = (async () => {
    try {
      const stored = await getStoredUthmaniSurah(number);
      if (stored) {
        surahCache.set(number, stored);
        return stored;
      }
    } catch {
      // IndexedDB may be unavailable; the bundled response remains a fallback.
    }
    const data = await fetchJson<SurahFull>(`/data/surah/${number}.json`);
    surahCache.set(number, data);
    try {
      await storeUthmaniSurah(data);
    } catch {
      // Keep the in-memory and service-worker caches usable when quota is tight.
    }
    return data;
  })();
  surahPending.set(number, task);
  try {
    return await task;
  } finally {
    if (surahPending.get(number) === task) surahPending.delete(number);
  }
}

export async function getIndoPakSurah(number: number): Promise<IndoPakSurah> {
  const pending = indoPakPending.get(number);
  if (pending) return pending;
  const task = (async () => {
    try {
      const stored = await getStoredIndoPakSurah(number);
      if (stored) return stored;
    } catch {
      // Fetch the bundled copy if IndexedDB is unavailable.
    }
    const data = await fetchJson<IndoPakSurah>(`/data/indopak/${number}.json`);
    try {
      await storeIndoPakSurah(data);
    } catch {
      // Keep the bundled service-worker copy usable if storage is full.
    }
    return data;
  })();
  indoPakPending.set(number, task);
  try {
    return await task;
  } finally {
    if (indoPakPending.get(number) === task) indoPakPending.delete(number);
  }
}

let completeTextCachePromise: Promise<void> | null = null;

/** Populate both local text editions after first load without blocking the UI. */
export function cacheCompleteQuranText(): Promise<void> {
  if (!completeTextCachePromise) {
    completeTextCachePromise = (async () => {
      const ordered = [...(await getSurahMetaList())].sort((a, b) => a.number - b.number);
      const [uthmaniCount, indoPakCount] = await Promise.all([
        countStoredQuranSurahs('uthmani'),
        countStoredQuranSurahs('indopak'),
      ]);
      if (uthmaniCount >= ordered.length && indoPakCount >= ordered.length) return;

      let cursor = 0;
      const worker = async () => {
        while (cursor < ordered.length) {
          const meta = ordered[cursor++];
          await Promise.all([getSurah(meta.number), getIndoPakSurah(meta.number)]);
        }
      };
      await Promise.all(Array.from({ length: 4 }, worker));
    })().catch((error: unknown) => {
      completeTextCachePromise = null;
      throw error;
    });
  }
  return completeTextCachePromise;
}

/* ---------------- whole-Qur'an corpus ---------------- */

let allSurahsPromise: Promise<SurahFull[]> | null = null;
const surahLoadListeners = new Set<(loaded: number, total: number) => void>();
let surahLoadProgress = { loaded: 0, total: 0 };

function reportSurahLoad(loaded: number, total: number) {
  surahLoadProgress = { loaded, total };
  surahLoadListeners.forEach((listener) => listener(loaded, total));
}

/** Observes how much of the corpus has been fetched (used by voice search). */
export function subscribeSurahLoad(listener: (loaded: number, total: number) => void): () => void {
  surahLoadListeners.add(listener);
  if (surahLoadProgress.total > 0) listener(surahLoadProgress.loaded, surahLoadProgress.total);
  return () => {
    surahLoadListeners.delete(listener);
  };
}

/**
 * Fetches every surah once, with a small worker pool so 114 requests do not
 * stampede the connection. Used by the voice-search corpus; cached afterwards.
 */
export function getAllSurahs(): Promise<SurahFull[]> {
  if (!allSurahsPromise) {
    allSurahsPromise = (async () => {
      const ordered = [...(await getSurahMetaList())].sort((a, b) => a.number - b.number);
      const results = new Array<SurahFull>(ordered.length);
      let cursor = 0;
      let loaded = 0;
      reportSurahLoad(0, ordered.length);

      const worker = async () => {
        while (cursor < ordered.length) {
          const position = cursor;
          cursor += 1;
          results[position] = await getSurah(ordered[position].number);
          loaded += 1;
          reportSurahLoad(loaded, ordered.length);
        }
      };

      await Promise.all(Array.from({ length: 6 }, worker));
      return results;
    })().catch((error) => {
      allSurahsPromise = null;
      throw error;
    });
  }
  return allSurahsPromise;
}

export function invalidateCache() {
  metaCache.surahs = undefined;
  metaCache.juz = undefined;
  surahCache.clear();
  allSurahsPromise = null;
  reportSurahLoad(0, 0);
}
