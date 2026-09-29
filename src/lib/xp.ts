import type { ProgressState } from '../types';

/**
 * Experience (XP) read-out.
 *
 * This is *derived*, not a ledger: every point below is computed from activity
 * the app already records, so there is no balance to store, spend or lose and
 * the "no currencies, coins or purchasable items" rule still holds. The two
 * exceptions are sharing and copying, which leave no other trace anywhere — a
 * monotonic count of those two actions is kept on the progression state purely
 * so their XP survives a reload.
 */

export const XP_RATES = {
  /** Minutes of recitation listened to. */
  perMinuteListened: 10,
  /** Distinct ayahs reached in the reader or the player. */
  perAyahReached: 10,
  /** A day on which the reader read or listened. */
  perDailySession: 50,
  /** A like / favourite (or a bookmark) kept. */
  perLike: 5,
  /** Text copied to the clipboard. */
  perCopy: 5,
  /** Content shared out of the app. */
  perShare: 15,
} as const;

/** XP needed for each level is quadratic, so levels slow down but never stop. */
const LEVEL_STEP = 50;

export interface XpBreakdown {
  /** XP from minutes of recitation. */
  listening: number;
  /** XP from ayahs reached. */
  ayahs: number;
  /** XP from days with activity. */
  dailySessions: number;
  /** XP from likes and bookmarks. */
  likes: number;
  /** XP from clipboard copies. */
  copies: number;
  /** XP from shares. */
  shares: number;
  total: number;
}

export interface XpStats {
  minutesListened: number;
  ayahsReached: number;
  activeDays: number;
  likedItems: number;
  copyCount: number;
  shareCount: number;
}

export interface XpProgress extends XpBreakdown {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level spans in total. */
  span: number;
  /** Lifetime XP at which the next level begins. */
  nextLevelAt: number;
  /** 0–100, progress through the current level. */
  percent: number;
  /** XP still needed for the next level. */
  toNext: number;
  stats: XpStats;
}

/** Level 1 at 0 XP, level 2 at 50, level 3 at 200, level 4 at 450 … */
export function levelFromXp(totalXp: number): number {
  const xp = Math.max(0, totalXp);
  return Math.floor(Math.sqrt(xp / LEVEL_STEP)) + 1;
}

/** Lifetime XP at which `level` begins (the inverse of {@link levelFromXp}). */
export function xpForLevel(level: number): number {
  const safe = Math.max(1, Math.floor(level));
  return LEVEL_STEP * (safe - 1) ** 2;
}

/** "1,250 XP" — grouped, so a lifetime total stays readable as it grows. */
export function formatXp(totalXp: number): string {
  const rounded = Math.max(0, Math.round(totalXp));
  return `${rounded.toLocaleString('en-US')} XP`;
}

export function formatListeningTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Activity the reader already has recorded, in the shape XP is read from. */
export type XpProgressSource = Pick<ProgressState, 'ayahsReached' | 'dailyActivity' | 'progression'> & {
  progression?: Partial<ProgressState['progression']> & {
    dailyListenMinutes?: Record<string, number>;
    counters?: { shares?: number; copies?: number };
  };
};

/**
 * Sums every XP source. Kept pure so the same maths serves the pill, the
 * progress card and any future export.
 */
export function computeXp(progress: XpProgressSource, likedItems: number): XpProgress {
  const minutesListened = Object.values(progress.progression?.dailyListenMinutes ?? {}).reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0,
  );
  const ayahsReached = Object.values(progress.ayahsReached ?? {}).reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0,
  );
  const activeDays = Object.keys(progress.dailyActivity ?? {}).length;
  const counters = progress.progression?.counters;
  const copyCount = Math.max(0, counters?.copies ?? 0);
  const shareCount = Math.max(0, counters?.shares ?? 0);

  const listening = minutesListened * XP_RATES.perMinuteListened;
  const ayahs = ayahsReached * XP_RATES.perAyahReached;
  const dailySessions = activeDays * XP_RATES.perDailySession;
  const likes = Math.max(0, likedItems) * XP_RATES.perLike;
  const copies = copyCount * XP_RATES.perCopy;
  const shares = shareCount * XP_RATES.perShare;
  const total = listening + ayahs + dailySessions + likes + copies + shares;

  const level = levelFromXp(total);
  const levelStart = xpForLevel(level);
  const nextLevelAt = xpForLevel(level + 1);
  const span = Math.max(1, nextLevelAt - levelStart);
  const into = Math.max(0, total - levelStart);

  return {
    listening,
    ayahs,
    dailySessions,
    likes,
    copies,
    shares,
    total,
    level,
    into,
    span,
    nextLevelAt,
    percent: Math.min(100, (into / span) * 100),
    toNext: Math.max(0, nextLevelAt - total),
    stats: { minutesListened, ayahsReached, activeDays, likedItems, copyCount, shareCount },
  };
}
