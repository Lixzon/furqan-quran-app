import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ProgressState } from '../../types';
import { loadState } from '../persist';
import { KEYS } from '../persist';

const empty: ProgressState = {
  lastRead: {},
  lastListened: {},
  surahCompleted: {},
  juzCompleted: {},
};

const initialState: ProgressState = loadState<ProgressState>(KEYS.progress, empty);

const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    /** remember where the user left off in a surah (ayah = numberInSurah) */
    rememberRead(state, action: PayloadAction<{ surah: number; ayah: number }>) {
      const { surah, ayah } = action.payload;
      state.lastRead[surah] = { ayah, at: Date.now() };
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
    },
  },
});

export const { rememberRead, markListened, markSurahComplete, setJuzCompleted, clearAllProgress } =
  progressSlice.actions;
export default progressSlice.reducer;
