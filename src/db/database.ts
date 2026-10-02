import Dexie, { type Table } from 'dexie';
import type { AyahBookmark } from '../store/slices/bookmarksSlice';

export interface StoredAudio {
  key: string; // `${reciter}|${surah}`
  reciter: string;
  surah: number;
  blob: Blob;
  size: number;
  storedAt: number;
}

/** Optional caching table for large fetched JSON (surah files) as a second
 *  offline layer on top of the service worker cache. */
export interface CachedJson {
  url: string;
  body: string;
  cachedAt: number;
}

export interface QuranTextRecord {
  id: string;
  edition: 'uthmani' | 'indopak';
  surah: number;
  data: unknown;
  cachedAt: number;
}

class FurqanDB extends Dexie {
  audio!: Table<StoredAudio, string>;
  cachedJson!: Table<CachedJson, string>;
  kv!: Table<{ key: string; value: unknown }, string>;
  bookmarks!: Table<AyahBookmark, string>;
  quranText!: Table<QuranTextRecord, string>;

  constructor() {
    super('furqan-db');
    this.version(1).stores({
      audio: 'key, reciter, surah, storedAt',
      cachedJson: 'url, cachedAt',
      kv: 'key',
    });
    this.version(2).stores({
      audio: 'key, reciter, surah, storedAt',
      cachedJson: 'url, cachedAt',
      kv: 'key',
      bookmarks: 'id, surah, createdAt',
    });
    this.version(3).stores({
      audio: 'key, reciter, surah, storedAt',
      cachedJson: 'url, cachedAt',
      kv: 'key',
      bookmarks: 'id, surah, createdAt',
      quranText: 'id, edition, surah',
    });
  }
}

export const db = new FurqanDB();

/* ---------- convenience API over the audio table ---------- */

export function audioKey(reciter: string, surah: number): string {
  return `${reciter}|${surah}`;
}

export function isUsableAudio(record: Pick<StoredAudio, 'blob' | 'size'>): boolean {
  return record.size >= 1024 && record.blob.size >= 1024 && record.blob.type.startsWith('audio/');
}

export async function isAudioDownloaded(reciter: string, surah: number): Promise<boolean> {
  const stored = await db.audio.get(audioKey(reciter, surah));
  return stored !== undefined && isUsableAudio(stored);
}

export async function getStoredAudio(reciter: string, surah: number): Promise<StoredAudio | undefined> {
  return db.audio.get(audioKey(reciter, surah));
}

export async function putStoredAudio(rec: StoredAudio): Promise<void> {
  await db.audio.put(rec);
}

export async function deleteStoredAudio(reciter: string, surah: number): Promise<void> {
  await db.audio.delete(audioKey(reciter, surah));
}

export async function allStoredAudio(): Promise<StoredAudio[]> {
  return db.audio.toArray();
}

export async function totalAudioBytes(): Promise<number> {
  const rows = await db.audio.toArray((a) => a.map((x) => x.size));
  return rows.reduce((s, n) => s + n, 0);
}

export async function deleteAllAudio(): Promise<void> {
  await db.audio.clear();
}

/* ---------- locally stored Quran editions ---------- */

function quranTextId(edition: QuranTextRecord['edition'], surah: number): string {
  return `${edition}:${surah}`;
}

export async function getQuranText<T>(edition: QuranTextRecord['edition'], surah: number): Promise<T | undefined> {
  const record = await db.quranText.get(quranTextId(edition, surah));
  return record?.data as T | undefined;
}

export async function putQuranText(
  edition: QuranTextRecord['edition'],
  surah: number,
  data: unknown,
): Promise<void> {
  await db.quranText.put({
    id: quranTextId(edition, surah),
    edition,
    surah,
    data,
    cachedAt: Date.now(),
  });
}

export async function countQuranText(edition: QuranTextRecord['edition']): Promise<number> {
  return db.quranText.where('edition').equals(edition).count();
}

export async function getQuranSearchIndex<T>(key: string): Promise<T | undefined> {
  const record = await db.kv.get(`quran-search:${key}`);
  return record?.value as T | undefined;
}

export async function putQuranSearchIndex(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key: `quran-search:${key}`, value });
}
