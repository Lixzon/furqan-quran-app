export interface PairedDailyHighlight {
  date: string;
  globalAyah: number;
}

export const PAIRED_DAILY_HIGHLIGHT_CHANGED_EVENT = 'lixzon:paired-daily-highlight:changed';

const STORAGE_KEY = 'lixzon.sync.daily-highlight.v1';
const TOTAL_AYAH_COUNT = 6236;

export function utcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getPairedDailyHighlight(date = new Date()): PairedDailyHighlight | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('date' in parsed) ||
      parsed.date !== utcDateKey(date) ||
      !('globalAyah' in parsed) ||
      typeof parsed.globalAyah !== 'number' ||
      !Number.isInteger(parsed.globalAyah) ||
      parsed.globalAyah < 1 ||
      parsed.globalAyah > TOTAL_AYAH_COUNT
    ) {
      return null;
    }
    return { date: parsed.date, globalAyah: parsed.globalAyah };
  } catch {
    return null;
  }
}

export function savePairedDailyHighlight(date: string, globalAyah: number): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isInteger(globalAyah) ||
    globalAyah < 1 ||
    globalAyah > TOTAL_AYAH_COUNT
  ) {
    throw new Error('The paired verse of the day is invalid.');
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, globalAyah }));
  } catch {
    throw new Error('Could not save the paired verse of the day in this browser.');
  }
  window.dispatchEvent(new Event(PAIRED_DAILY_HIGHLIGHT_CHANGED_EVENT));
}
