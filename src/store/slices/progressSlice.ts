import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ActivityEntry, ProgressState } from '../../types';
import { loadState } from '../persist';
import { KEYS } from '../persist';
import {
  DAY_KEY_VERSION,
  ISTIQAMAH_MILESTONES,
  countDailyActivity,
  emptyProgression,
  migrateProgression,
  todayKey,
  withLocalDaysBackfilled,
} from '../../lib/progression';

const empty: ProgressState = {
  lastRead: {},
  lastListened: {},
  surahCompleted: {},
  juzCompleted: {},
  lastPosition: null,
  activity: [],
  dailyActivity: {},
  ayahsReached: {},
  milestones: {},
  quoteHistory: [],
  progression: emptyProgression,
};

const stored = loadState<ProgressState>(KEYS.progress, empty);

/**
 * States written before version 2 keyed their days by UTC. Re-mark the recent
 * activity by local day first, so the streak migration has correct days to
 * settle onto.
 */
function withDayKeysMigrated(state: ProgressState): ProgressState {
  if ((state.progression?.dayKeyVersion ?? 1) >= DAY_KEY_VERSION) return state;
  return {
    ...state,
    dailyActivity: withLocalDaysBackfilled(state.dailyActivity ?? {}, state.activity ?? []),
  };
}

// Normalise legacy field names (longestStreak/lastGoalDate/freezes/claimedTiers)
// into the unified streak state on first load.
const initialised = withDayKeysMigrated(stored);
const initialState: ProgressState = {
  ...initialised,
  progression: migrateProgression(
    initialised.progression,
    initialised.dailyActivity ?? {},
    todayKey(),
  ),
};

function dateKey(at: number): string {
  return new Date(at).toISOString().slice(0, 10);
}

function recordActivity(state: ProgressState, entry: ActivityEntry): void {
  state.lastPosition = entry;
  const day = dateKey(entry.at);
  state.dailyActivity[day] = true;
  // Every recorded ayah or listening event flows through the one streak
  // function, so there is a single code path for counting a day.
  countDailyActivity(state.progression, day);
  state.ayahsReached[entry.surah] = Math.max(state.ayahsReached[entry.surah] ?? 0, entry.ayah);
  const previous = state.activity[0];
  if (!previous || previous.surah !== entry.surah || previous.ayah !== entry.ayah || previous.kind !== entry.kind) {
    state.activity.unshift(entry);
    state.activity = state.activity.slice(0, 200);
  } else {
    state.activity[0] = entry;
  }
}

const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    restoreProgress(_state, action: PayloadAction<ProgressState>) {
      // Merge over defaults and normalise legacy streak keys so backups written
      // before the streak state was unified still restore cleanly.
      const merged = withDayKeysMigrated({ ...empty, ...action.payload });
      return {
        ...merged,
        progression: migrateProgression(
          action.payload?.progression,
          merged.dailyActivity ?? {},
          todayKey(),
        ),
      };
    },
    /** remember where the user left off in a surah (ayah = numberInSurah) */
    rememberRead(state, action: PayloadAction<{ surah: number; ayah: number; name?: string }>) {
      const { surah, ayah, name = `Surah ${surah}` } = action.payload;
      const at = Date.now();
      state.lastRead[surah] = { ayah, at };
      recordActivity(state, { surah, ayah, name, at, kind: 'read' });
    },
    rememberListened(state, action: PayloadAction<{ surah: number; ayah: number; name?: string }>) {
      const { surah, ayah, name = `Surah ${surah}` } = action.payload;
      recordActivity(state, { surah, ayah, name, at: Date.now(), kind: 'listen' });
    },
    /** a surah was played to the end */
    markListened(state, action: PayloadAction<number>) {
      const surah = action.payload;
      state.lastListened[surah] = Date.now();
    },
    markSurahComplete(state, action: PayloadAction<{ surah: number; value: boolean }>) {
      state.surahCompleted[action.payload.surah] = action.payload.value;
    },
    setJuzCompleted(state, action: PayloadAction<{ juz: number; value: boolean }>) {
      state.juzCompleted[action.payload.juz] = action.payload.value;
    },
    clearAllProgress(state) {
      state.lastRead = {};
      state.lastListened = {};
      state.surahCompleted = {};
      state.juzCompleted = {};
      state.lastPosition = null;
      state.activity = [];
      state.dailyActivity = {};
      state.ayahsReached = {};
      state.milestones = {};
      state.quoteHistory = [];
      state.progression = { ...emptyProgression };
    },

    /**
     * The single "a day was completed" entry point. Call this whenever the
     * daily goal is met; it is idempotent, so it is safe to call on every
     * activity or render tick.
     */
    recordDailyActivity(state, action: PayloadAction<{ today: string }>) {
      const { today } = action.payload;
      if (!state.dailyActivity[today]) return;
      countDailyActivity(state.progression, today);
    },

    /**
     * The streak was protected by a Ruksah; the reader has been told, so the
     * pending notice can be cleared.
     */
    clearFreezeNotice(state) {
      state.progression.freezeNoticeFor = null;
    },

    markDailyCelebrated(state, action: PayloadAction<{ date: string }>) {
      state.progression.dailyGoalCelebratedDate = action.payload.date;
    },

    claimTier(state, action: PayloadAction<{ tier: number }>) {
      if (!state.progression.unlockedTiers.includes(action.payload.tier)) {
        state.progression.unlockedTiers.push(action.payload.tier);
      }
    },

    setIstiqamahGoal(state, action: PayloadAction<{ days: number }>) {
      state.progression.istiqamahGoal = action.payload.days;
    },

    celebrateMilestone(state, action: PayloadAction<{ days: number }>) {
      if (!state.progression.celebratedMilestones.includes(action.payload.days)) {
        state.progression.celebratedMilestones.push(action.payload.days);
      }
    },

    addListenMinute(state, action: PayloadAction<{ date: string }>) {
      const minutes = state.progression.dailyListenMinutes;
      minutes[action.payload.date] = (minutes[action.payload.date] ?? 0) + 1;
    },

    /* ---------- developer test controls (Settings) ---------- */

    devAddStreakDays(state, action: PayloadAction<{ days: number }>) {
      const progression = state.progression;
      progression.currentStreak = Math.max(0, progression.currentStreak + action.payload.days);
      progression.highestStreak = Math.max(progression.highestStreak, progression.currentStreak);
      // Mark today as already counted so countDailyActivity does not re-derive
      // the streak from real activity and wipe the simulation on the next load.
      progression.lastActiveDate = todayKey();
    },

    devSetStreak(state, action: PayloadAction<{ days: number }>) {
      const progression = state.progression;
      progression.currentStreak = Math.max(0, action.payload.days);
      progression.highestStreak = Math.max(progression.highestStreak, progression.currentStreak);
      progression.lastActiveDate = todayKey();
    },

    devResetStreak(state) {
      state.progression = { ...emptyProgression, istiqamahGoal: ISTIQAMAH_MILESTONES[0] };
    },
    recordQuoteView(state, action: PayloadAction<string>) {
      state.quoteHistory = [
        { id: action.payload, at: Date.now() },
        ...state.quoteHistory.filter((entry) => entry.id !== action.payload),
      ].slice(0, 100);
    },
  },
});

export const {
  restoreProgress,
  rememberRead,
  rememberListened,
  markListened,
  markSurahComplete,
  setJuzCompleted,
  clearAllProgress,
  recordQuoteView,
  recordDailyActivity,
  clearFreezeNotice,
  markDailyCelebrated,
  claimTier,
  setIstiqamahGoal,
  celebrateMilestone,
  addListenMinute,
  devAddStreakDays,
  devSetStreak,
  devResetStreak,
} = progressSlice.actions;
export default progressSlice.reducer;
