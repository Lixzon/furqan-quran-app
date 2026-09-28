import type { AccentId, ProgressionState, ThemeMode } from '../types';

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

/** Max Ruksah (streak freezes) a reader can hold. Running out is possible. */
export const FREEZE_CAP = 2;

/** Ruksah are awarded once a full month of consistency has been kept. */
export const FREEZE_AWARD_EVERY_DAYS = 30;

/** Ruksah granted per award, subject to {@link FREEZE_CAP}. */
export const FREEZE_AWARD_AMOUNT = 2;

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
  } as ProgressionState & LegacyProgression;

  // Drop the pre-unification keys so a single set of fields is ever persisted.
  delete progression.longestStreak;
  delete progression.lastGoalDate;
  delete progression.freezes;
  delete progression.claimedTiers;
  // The consent prompt is gone: Ruksah are now spent automatically.
  delete progression.missedDayPromptedFor;

  if (!progression.lastActiveDate) {
    let run = 0;
    let cursor = today;
    while (dailyActivity[cursor]) {
      run += 1;
      cursor = shiftDateKey(cursor, -1);
    }
    if (run > 0) {
      progression.currentStreak = run;
      progression.lastActiveDate = today;
      progression.highestStreak = Math.max(progression.highestStreak, run);
    }
  }

  return progression;
}

export type StreakOutcome =
  /** Today has already been counted. */
  | 'already-counted'
  /** Streak extended from yesterday. */
  | 'continued'
  /** First day, or a new run after a gap. */
  | 'started'
  /** One day was missed and a Ruksah was spent automatically to bridge it. */
  | 'freeze-used';

/**
 * The single place streak maths happens. Called by every activity recorder
 * (`rememberRead`, `rememberListened`) and by `recordDailyActivity`.
 *
 * Mutates the passed state so it works for both Immer drafts and plain objects.
 *
 * A Ruksah is spent automatically: when exactly one day was missed and the
 * reader has one in stock, it is consumed to bridge that day so the streak
 * survives without any prompt. The reader is told afterwards via
 * `freezeNoticeFor`, which the streak hub turns into a notice.
 */
export function countDailyActivity(progression: ProgressionState, today: string): StreakOutcome {
  if (progression.lastActiveDate === today) return 'already-counted';

  const yesterday = shiftDateKey(today, -1);
  const twoDaysAgo = shiftDateKey(today, -2);
  let protectedDay: string | null = null;

  if (progression.lastActiveDate === null) {
    progression.currentStreak = 1;
  } else if (progression.lastActiveDate === yesterday) {
    progression.currentStreak += 1;
  } else if (progression.lastActiveDate === twoDaysAgo && progression.streakFreezes > 0) {
    // A Ruksah covers exactly one missed day; longer gaps restart the run.
    progression.streakFreezes -= 1;
    if (!progression.freezeUsedDates.includes(yesterday)) progression.freezeUsedDates.push(yesterday);
    progression.freezeNoticeFor = yesterday;
    progression.currentStreak += 1;
    protectedDay = yesterday;
  } else {
    progression.currentStreak = 1;
  }

  progression.lastActiveDate = today;
  progression.highestStreak = Math.max(progression.highestStreak, progression.currentStreak);

  // A full month of consistency earns a fresh set of Ruksah, up to the cap.
  if (
    progression.currentStreak > 0 &&
    progression.currentStreak % FREEZE_AWARD_EVERY_DAYS === 0 &&
    progression.streakFreezes < FREEZE_CAP
  ) {
    progression.streakFreezes = Math.min(FREEZE_CAP, progression.streakFreezes + FREEZE_AWARD_AMOUNT);
  }

  if (protectedDay) return 'freeze-used';
  return progression.currentStreak === 1 ? 'started' : 'continued';
}

/** ISO yyyy-mm-dd for a Date (local time, matching the activity log). */
export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function shiftDateKey(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const from = Date.parse(`${fromKey}T00:00:00Z`);
  const to = Date.parse(`${toKey}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return Number.POSITIVE_INFINITY;
  return Math.round((to - from) / 86_400_000);
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
  return days >= tier.days;
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
}

/** Weekday initials for a Monday-first week, matching the hub's "M T W T F S S". */
const MONDAY_FIRST_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * The current week, Monday through Sunday, so the strip always reads
 * "M T W T F S S". Days that have not arrived yet are marked as future.
 */
export function weeklyStrip(dailyActivity: Record<string, boolean>, today: string): WeekDay[] {
  const [year, month, day] = today.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  const monday = shiftDateKey(today, -((weekday + 6) % 7));

  const strip: WeekDay[] = [];
  for (let index = 0; index < 7; index++) {
    const key = shiftDateKey(monday, index);
    strip.push({
      key,
      label: MONDAY_FIRST_INITIALS[index],
      done: Boolean(dailyActivity[key]),
      isToday: key === today,
      isFuture: daysBetween(today, key) > 0,
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
