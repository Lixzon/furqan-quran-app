import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ActivityEntry, ProgressState } from '../../types';
import { loadState } from '../persist';
import { KEYS } from '../persist';

const empty: ProgressState = {
  lastRead: {},
  lastListened: {},
  surahCompleted: {},
  juzCompleted: {},
  lastPosition: null,
  activity: [],
  dailyActivity: {},
  ayahsReached: {},
  quoteHistory: [],
};

const initialState: ProgressState = loadState<ProgressState>(KEYS.progress, empty);

function dateKey(at: number): string {
  return new Date(at).toISOString().slice(0, 10);
}

function recordActivity(state: ProgressState, entry: ActivityEntry): void {
  state.lastPosition = entry;
  state.dailyActivity[dateKey(entry.at)] = true;
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
      state.quoteHistory = [];
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
  rememberRead,
  rememberListened,
  markListened,
  markSurahComplete,
  setJuzCompleted,
  clearAllProgress,
  recordQuoteView,
} = progressSlice.actions;
export default progressSlice.reducer;
