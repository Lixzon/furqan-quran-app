import type { ProgressionState } from '../types';

/**
 * Calendar-based streak (Istiqamah) engine.
 *
 * The rules encoded here are deliberately small and pure so both the store and
 * the UI can rely on one definition of "a day":
 *
 * - **Local midnight reset.** A day runs 00:00:00–23:59:59 in the reader's own
 *   timezone. Day keys use the local calendar parts, never `toISOString()`.
 * - **Late-night grace window.** Activity recorded between 00:00 and 03:00 is
 *   credited to the previous calendar day when that day is still unfulfilled,
 *   so a late reading session never silently breaks a streak.
 * - **Active criteria.** A day becomes active once the reader has spent
 *   {@link READ_MINUTES_FOR_ACTIVE_DAY} minutes reading it, or has completed a
 *   recommended recitation. See {@link isActiveDay}.
 * - **Streak calculation.** Same day keeps the run; the next day increments it;
 *   a single missed day is bridged with a Ruksah (freeze) when one is in stock;
 *   any longer gap restarts the run at 1.
 */

/**
 * Bumped whenever the rule for turning an instant into a day key changes.
 * Version 1 was the UTC day; version 2 is the reader's local day. A stored
 * state with no version predates this and was written under the UTC rule.
 */
export const DAY_KEY_VERSION = 2;

/** Minutes of foreground reading that make a day active. */
export const READ_MINUTES_FOR_ACTIVE_DAY = 3;

/**
 * Local hour at which the late-night grace window closes. Activity before this
 * hour may still belong to the previous day.
 */
export const GRACE_WINDOW_END_HOUR = 3;

/** Max Ruksah (streak freezes) a reader can hold. Running out is possible. */
export const FREEZE_CAP = 2;

/** Ruksah are awarded once a full month of consistency has been kept. */
export const FREEZE_AWARD_EVERY_DAYS = 30;

/** Ruksah granted per award, subject to {@link FREEZE_CAP}. */
export const FREEZE_AWARD_AMOUNT = 2;

/**
 * Whether the day's tracked effort meets the active criteria: the reader read
 * for {@link READ_MINUTES_FOR_ACTIVE_DAY} minutes, or completed one recommended
 * recitation.
 */
export function isActiveDay(readMinutes: number, completedRecommendedRecitation = false): boolean {
  return completedRecommendedRecitation || readMinutes >= READ_MINUTES_FOR_ACTIVE_DAY;
}

/**
 * `yyyy-mm-dd` in the reader's own calendar.
 *
 * This must use the local date parts rather than `toISOString()`: the ISO form
 * is UTC, so for a reader in Jakarta or Karachi the reading day would roll over
 * mid-morning local time and a late-evening session could land on the wrong day.
 */
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

/**
 * The local day an activity instant belongs to, applying the late-night grace
 * window: before {@link GRACE_WINDOW_END_HOUR} the activity is credited to the
 * previous day while that day is still unfulfilled.
 */
export function activityDayKey(date: Date, dailyActivity: Record<string, boolean>): string {
  const currentDay = dateKey(date);
  if (date.getHours() < GRACE_WINDOW_END_HOUR) {
    const previousDay = shiftDateKey(currentDay, -1);
    if (!dailyActivity[previousDay]) return previousDay;
  }
  return currentDay;
}

/**
 * Shifts a day key by a number of days. This is pure calendar arithmetic on the
 * key itself, not on an instant, so the UTC internals are correct and
 * deliberate — do not "fix" them to local time.
 */
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
 * The single place streak maths happens. Called when a day first meets the
 * active criteria, and idempotently afterwards by `recordDailyActivity`.
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
