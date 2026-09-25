import { audioStreamUrl } from './constants';

const TIMING_DATA_PATH = '/data/timing';

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

const timingCache = new Map<string, SurahTimingData | null>();

function normalizeAudioUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return value;
  return `https://${value.replace(/^https?:\/\//i, '')}`;
}

export async function getSurahTimingData(reciter: string, surah: number): Promise<SurahTimingData | null> {
  const key = `${reciter}|${surah}`;
  if (timingCache.has(key)) return timingCache.get(key) ?? null;

  try {
    const res = await fetch(`${TIMING_DATA_PATH}/${encodeURIComponent(reciter)}/${surah}.json`, { cache: 'force-cache' });
    if (!res.ok) {
      timingCache.set(key, null);
      return null;
    }
    const data = (await res.json()) as SurahTimingData;
    const normalized: SurahTimingData = {
      ...data,
      audioUrl: normalizeAudioUrl(data.audioUrl ?? null),
      timestamps: Array.isArray(data.timestamps) ? data.timestamps.map((segment) => ({
        start: Number(segment.start) || 0,
        end: Number(segment.end) || 0,
      })) : [],
    };
    timingCache.set(key, normalized);
    return normalized;
  } catch {
    timingCache.set(key, null);
    return null;
  }
}

export async function resolveAudioSourceUrl(reciter: string, surah: number): Promise<string> {
  const timing = await getSurahTimingData(reciter, surah);
  if (timing?.audioUrl) return timing.audioUrl;
  return audioStreamUrl(reciter, surah);
}
