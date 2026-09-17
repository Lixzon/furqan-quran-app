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

export function invalidateCache() {
  metaCache.surahs = undefined;
  metaCache.juz = undefined;
  surahCache.clear();
}
