import { useLiveQuery } from 'dexie-react-hooks';
import { db, allStoredAudio, isAudioDownloaded } from '../db/database';
import { useState, useEffect } from 'react';

/** Live set of surah numbers already downloaded for a given reciter. */
export function useDownloadedSet(reciter: string): Set<number> {
  const rows = useLiveQuery(
    async () => {
      const all = await allStoredAudio();
      return all.filter((r) => r.reciter === reciter).map((r) => r.surah);
    },
    [reciter],
  );
  return new Set(rows ?? []);
}

/** Total stored audio bytes + record count across all reciters. */
export function useStorageStats(): { bytes: number; count: number } {
  const stats = useLiveQuery(async () => {
    const all = await allStoredAudio();
    return { bytes: all.reduce((s, r) => s + r.size, 0), count: all.length };
  }, []);
  return stats ?? { bytes: 0, count: 0 };
}

/** One-shot check (used in non-hook code paths). */
export function useIsDownloaded(reciter: string, surah: number): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let alive = true;
    void isAudioDownloaded(reciter, surah).then((v) => {
      if (alive) setOk(v);
    });
    return () => {
      alive = false;
    };
  }, [reciter, surah]);
  return ok;
}

/** Re-exporting db for convenience in components. */
export { db };
