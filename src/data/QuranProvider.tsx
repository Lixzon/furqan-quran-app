import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { JuzBoundary, SurahMeta } from '../types';
import { getJuzList, getSurahMetaList } from '../lib/dataClient';

interface QuranData {
  surahs: SurahMeta[] | null;
  juz: JuzBoundary[] | null;
  error: string | null;
  retry: () => void;
  surahById: (n: number) => SurahMeta | undefined;
}

const Ctx = createContext<QuranData | null>(null);

export function QuranProvider({ children }: { children: ReactNode }) {
  const [surahs, setSurahs] = useState<SurahMeta[] | null>(null);
  const [juz, setJuz] = useState<JuzBoundary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    Promise.all([getSurahMetaList(), getJuzList()])
      .then(([s, j]) => {
        if (!alive) return;
        setSurahs(s);
        setJuz(j);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  const surahById = useCallback(
    (n: number) => surahs?.find((s) => s.number === n),
    [surahs],
  );

  const retry = useCallback(() => setTick((t) => t + 1), []);
  const value = useMemo<QuranData>(
    () => ({ surahs, juz, error, retry, surahById }),
    [surahs, juz, error, retry, surahById],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuran(): QuranData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useQuran must be used inside QuranProvider');
  return ctx;
}
