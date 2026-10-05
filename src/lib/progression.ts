import type { AccentId, ProgressionState, ThemeMode } from '../types';
import { DAY_KEY_VERSION, dateKey, daysBetween, shiftDateKey } from '../utils/streakEngine';

// The calendar and streak rules live in the dedicated engine module; they are
// re-exported here so existing `lib/progression` imports keep working.
export {
  DAY_KEY_VERSION,
  FREEZE_AWARD_AMOUNT,
  FREEZE_AWARD_EVERY_DAYS,
  FREEZE_CAP,
  GRACE_WINDOW_END_HOUR,
  READ_MINUTES_FOR_ACTIVE_DAY,
  activityDayKey,
  countDailyActivity,
  dateKey,
  daysBetween,
  isActiveDay,
  shiftDateKey,
  todayKey,
} from '../utils/streakEngine';
export type { StreakOutcome } from '../utils/streakEngine';

function isLocalDevOverrideEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/**
 * Istiqamah (consistency) progression.
 *
 * Everything here is derived from the reader's own daily activity log — there
 * are no points, coins or virtual currencies. Unlocks are spiritual milestones,
 * badges and visual themes only.
 */

export interface TierDefinition {
  tier: 1 | 2 | 3 | 4 | 5;
  days: number;
  name: string;
  arabicName: string;
  badge: 'bronze' | 'silver' | 'gold' | 'platinum' | 'master';
  /** What the tier grants, in the reader's words. */
  unlocks: string;
  /** Visual theme applied when the reader taps "Apply" on the unlock card. */
  theme?: { mode?: ThemeMode; accent?: AccentId };
  /** Non-theme reward (badge is always granted). */
  reward?: string;
}

export const TIERS: TierDefinition[] = [
  {
    tier: 1,
    days: 7,
    name: 'The Habit',
    arabicName: 'Al-Bidayah',
    badge: 'bronze',
    unlocks: 'Bronze Flame badge and a custom Qur’an bookmark icon',
    reward: 'Custom bookmark icon',
  },
  {
    tier: 2,
    days: 30,
    name: 'Monthly Istiqamah',
    arabicName: 'Istiqamah Shahriyyah',
    badge: 'silver',
    unlocks: 'Silver Flame badge and the Emerald accent theme',
    theme: { accent: 'emerald' },
  },
  {
    tier: 3,
    days: 120,
    name: 'The Reader',
    arabicName: 'Al-Qari',
    badge: 'gold',
    unlocks: 'Gold Flame badge and the Sapphire theme',
    theme: { accent: 'sapphire' },
  },
  {
    tier: 4,
    days: 300,
    name: 'The Guardian',
    arabicName: 'Al-Hafiz',
    badge: 'platinum',
    unlocks: 'Platinum Flame badge and Dark Velvet mode',
    theme: { mode: 'velvet' },
  },
  {
    tier: 5,
    days: 365,
    name: 'The Golden Istiqamah',
    arabicName: 'Al-Istiqamah adh-Dhahabiyyah',
    badge: 'master',
    unlocks: 'The Master one-year golden interface',
    theme: { mode: 'golden', accent: 'gold' },
  },
];

/** Flame tint per badge tier, shared by the popups and Settings. */
export const BADGE_TONES: Record<TierDefinition['badge'], string> = {
  bronze: '#b06a3b',
  silver: '#9aa4ad',
  gold: '#d4a017',
  platinum: '#7fd1d8',
  master: '#f0c53f',
};

/** Milestones where the reader is invited to choose their next goal. */
export const ISTIQAMAH_MILESTONES = [25, 50, 75, 100];

/** Total ayahs in the Qur'an, used for the yearly khatm estimate. */
export const TOTAL_QURAN_AYAHS = 6236;

export const emptyProgression: ProgressionState = {
  currentStreak: 0,
  highestStreak: 0,
  lastActiveDate: null,
  streakFreezes: 0,
  freezeUsedDates: [],
  unlockedTiers: [],
  istiqamahGoal: ISTIQAMAH_MILESTONES[0],
  celebratedMilestones: [],
  freezeNoticeFor: null,
  dailyGoalCelebratedDate: null,
  dailyListenMinutes: {},
  dailyReadMinutes: {},
  dayKeyVersion: DAY_KEY_VERSION,
  counters: { shares: 0, copies: 0 },
};

/** Field names used before the streak state was unified. */
interface LegacyProgression {
  longestStreak?: number;
  lastGoalDate?: string | null;
  freezes?: number;
  claimedTiers?: number[];
  /** Missed-day consent prompt, dropped once freezes became automatic. */
  missedDayPromptedFor?: string | null;
}

/**
 * Re-marks recent activity under the reader's local day.
 *
 * Before version 2 the ledger was keyed by the UTC day, so a reading taken in
 * the small hours east of UTC (or late evening west of it) could be filed one
 * day off. Left alone, that skew later reads as a phantom missed day and can
 * silently spend a Ruksah. The activity log keeps real timestamps, so the
 * correct local day can be re-derived from it.
 *
 * Additive only: marks are never removed. The log is capped and collapses
 * repeated positions, so a missing entry is not proof that a day was empty —
 * removing marks could destroy genuine history. A stale mark may therefore
 * survive on a skewed day, which is cosmetic.
 */
export function withLocalDaysBackfilled(
  dailyActivity: Record<string, boolean>,
  activity: { at: number }[],
): Record<string, boolean> {
  const next = { ...dailyActivity };
  for (const entry of activity) {
    if (!Number.isFinite(entry?.at)) continue;
    next[dateKey(new Date(entry.at))] = true;
  }
  return next;
}

/**
 * Reconstructs the run of days ending on the latest recorded day at or before
 * `today`. A day counts when it has activity, or when a Ruksah was spent on it,
 * so freeze-protected days do not truncate the run.
 */
function runEndingAt(
  dailyActivity: Record<string, boolean>,
  freezeUsedDates: string[],
  today: string,
): { end: string | null; days: number } {
  let end: string | null = null;
  for (const key of [...Object.keys(dailyActivity), ...freezeUsedDates]) {
    if (daysBetween(key, today) < 0) continue; // never anchor on a future day
    if (end === null || daysBetween(end, key) > 0) end = key;
  }
  if (end === null) return { end: null, days: 0 };

  let days = 0;
  let cursor = end;
  while (dailyActivity[cursor] || freezeUsedDates.includes(cursor)) {
    days += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return { end, days };
}

/**
 * Normalises anything loaded from storage or a backup into the unified shape:
 * legacy field names are mapped across, and a streak is seeded from the
 * activity log the first time so readers do not lose an earned streak.
 */
export function migrateProgression(
  raw: (Partial<ProgressionState> & LegacyProgression) | undefined,
  dailyActivity: Record<string, boolean>,
  today: string,
): ProgressionState {
  const source = raw ?? {};
  const progression = {
    ...emptyProgression,
    ...source,
    highestStreak: source.highestStreak ?? source.longestStreak ?? 0,
    lastActiveDate: source.lastActiveDate ?? source.lastGoalDate ?? null,
    streakFreezes: source.streakFreezes ?? source.freezes ?? 0,
    unlockedTiers: source.unlockedTiers ?? source.claimedTiers ?? [],
    // Counters are per-action tallies, so a partial or missing record reads as zero.
    counters: {
      shares: Math.max(0, source.counters?.shares ?? 0),
      copies: Math.max(0, source.counters?.copies ?? 0),
    },
    dailyReadMinutes: source.dailyReadMinutes ?? {},
  } as ProgressionState & LegacyProgression;

  // Drop the pre-unification keys so a single set of fields is ever persisted.
  delete progression.longestStreak;
  delete progression.lastGoalDate;
  delete progression.freezes;
  delete progression.claimedTiers;
  // The consent prompt is gone: Ruksah are now spent automatically.
  delete progression.missedDayPromptedFor;

  if (!progression.lastActiveDate) {
    // No anchor at all: rebuild the run from the ledger.
    const run = runEndingAt(dailyActivity, progression.freezeUsedDates, today);
    if (run.end) {
      progression.currentStreak = run.days;
      progression.lastActiveDate = run.end;
      progression.highestStreak = Math.max(progression.highestStreak, run.days);
    }
  } else if ((source.dayKeyVersion ?? 1) < DAY_KEY_VERSION) {
    // One-time repair for the UTC -> local day switch. Historical keys are left
    // exactly as stored: rewriting them would be guesswork that could move or
    // destroy a day of history. What the switch *can* break is the anchor — a
    // reading logged under the old rule may sit one day off the local lattice,
    // which would surface as a phantom missed day and silently spend a Ruksah.
    // Re-deriving the run from the ledger settles the anchor onto the days that
    // actually carry a mark. This depends on `withLocalDaysBackfilled` having
    // already re-marked those days by local date.
    const run = runEndingAt(dailyActivity, progression.freezeUsedDates, today);
    if (run.end && run.days > 0) {
      progression.lastActiveDate = run.end;
      progression.currentStreak = run.days;
      progression.highestStreak = Math.max(progression.highestStreak, run.days);
    }
  }

  progression.dayKeyVersion = DAY_KEY_VERSION;

  return progression;
}

export function tierForDays(days: number): TierDefinition {
  let reached = TIERS[0];
  for (const tier of TIERS) if (days >= tier.days) reached = tier;
  return reached;
}

export function nextTier(days: number): TierDefinition | null {
  return TIERS.find((tier) => days < tier.days) ?? null;
}

/** Progress towards a tier as 0..1 plus remaining days. */
export function tierProgress(days: number, tier: TierDefinition): { ratio: number; remaining: number } {
  const ratio = Math.max(0, Math.min(1, days / tier.days));
  return { ratio, remaining: Math.max(0, tier.days - days) };
}

export function isTierUnlocked(days: number, tier: TierDefinition): boolean {
  return isLocalDevOverrideEnabled() || days >= tier.days;
}

/** The highest badge earned so far (used for the flame treatment). */
export function earnedBadge(days: number): TierDefinition['badge'] | null {
  if (days <= 0) return null;
  return tierForDays(days).badge;
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface WeekDay {
  key: string;
  label: string;
  done: boolean;
  isToday: boolean;
  /** The day is later this week and has not arrived yet. */
  isFuture: boolean;
  /** The day carries no activity of its own but a Ruksah covered it. */
  frozen: boolean;
}

/** Weekday initials for a Monday-first week, matching the hub's "M T W T F S S". */
const MONDAY_FIRST_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * The current week, Monday through Sunday, so the strip always reads
 * "M T W T F S S". Days that have not arrived yet are marked as future, and
 * days a Ruksah protected are reported as `frozen` so the strip agrees with the
 * streak counter instead of showing a bare gap.
 */
export function weeklyStrip(
  dailyActivity: Record<string, boolean>,
  freezeUsedDates: string[],
  today: string,
): WeekDay[] {
  const [year, month, day] = today.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  const monday = shiftDateKey(today, -((weekday + 6) % 7));

  const strip: WeekDay[] = [];
  for (let index = 0; index < 7; index++) {
    const key = shiftDateKey(monday, index);
    const done = Boolean(dailyActivity[key]);
    strip.push({
      key,
      label: MONDAY_FIRST_INITIALS[index],
      done,
      isToday: key === today,
      isFuture: daysBetween(today, key) > 0,
      // Activity always wins, so a day that was both read and frozen reads as done.
      frozen: !done && freezeUsedDates.includes(key),
    });
  }
  return strip;
}

export interface RecapDay {
  key: string;
  label: string;
  ayahs: number;
  minutes: number;
}

/** Per-day ayah counts (from the activity log) plus tracked listening minutes. */
export function weeklyRecap(
  activity: { surah: number; ayah: number; at: number }[],
  dailyListenMinutes: Record<string, number>,
  today: string,
): RecapDay[] {
  const days: RecapDay[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const key = shiftDateKey(today, -offset);
    const seen = new Set<string>();
    for (const entry of activity) {
      if (dateKey(new Date(entry.at)) !== key) continue;
      seen.add(`${entry.surah}:${entry.ayah}`);
    }
    const [year, month, day] = key.split('-').map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    days.push({ key, label: WEEKDAY_INITIALS[weekday], ayahs: seen.size, minutes: dailyListenMinutes[key] ?? 0 });
  }
  return days;
}

/** Estimate of how much of the whole Qur'an the reader has reached. */
export function khatmProgress(ayahsReached: Record<number, number>): number {
  const total = Object.values(ayahsReached).reduce((sum, count) => sum + count, 0);
  return Math.max(0, Math.min(100, (total / TOTAL_QURAN_AYAHS) * 100));
}

/** The next milestone the reader has not yet been offered. */
export function pendingMilestone(progression: ProgressionState): number | null {
  const reached = ISTIQAMAH_MILESTONES.find(
    (days) => progression.currentStreak >= days && !progression.celebratedMilestones.includes(days),
  );
  return reached ?? null;
}

/** Goals offered at a milestone: the remaining milestones above the current streak. */
export function goalOptions(currentStreak: number): number[] {
  return ISTIQAMAH_MILESTONES.filter((days) => days > currentStreak).slice(0, 3);
}
