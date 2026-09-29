import type { JuzBoundary, SurahFull, SurahMeta } from '../types';

/** Simple in-memory + session fetch layer over the bundled static data in /public/data. */

const metaCache: { surahs?: SurahMeta[]; juz?: JuzBoundary[] } = {};
const surahCache = new Map<number, SurahFull>();

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
  const data = await fetchJson<SurahFull>(`/data/surah/${number}.json`);
  surahCache.set(number, data);
  return data;
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
