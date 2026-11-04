import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { KEYS, loadState } from '../persist';

export const MEMORIZATION_REPETITION_GOAL = 50;

export interface MemorizedAyah {
  id: string;
  surah: number;
  ayah: number;
  surahName: string;
  arabic: string;
  translation: string;
  repetitions: number;
  memorized: boolean;
  updatedAt: number;
}

export interface MemorizedState {
  items: MemorizedAyah[];
}

const initialState = loadState<MemorizedState>(KEYS.memorized, { items: [] });

type MemorizedAyahInfo = Pick<MemorizedAyah, 'id' | 'surah' | 'ayah' | 'surahName' | 'arabic' | 'translation'>;

const memorizedSlice = createSlice({
  name: 'memorized',
  initialState,
  reducers: {
    toggleMemorizedAyah(state, action: PayloadAction<MemorizedAyahInfo>) {
      const existing = state.items.find((item) => item.id === action.payload.id);
      if (existing) {
        existing.memorized = !existing.memorized;
        if (!existing.memorized) existing.repetitions = 0;
        existing.updatedAt = Date.now();
        return;
      }

      state.items.unshift({
        ...action.payload,
        repetitions: 0,
        memorized: true,
        updatedAt: Date.now(),
      });
    },
    recordMemorizationRepetition(state, action: PayloadAction<MemorizedAyahInfo>) {
      const existing = state.items.find((item) => item.id === action.payload.id);
      if (existing) {
        existing.repetitions += 1;
        if (existing.repetitions >= MEMORIZATION_REPETITION_GOAL) existing.memorized = true;
        existing.updatedAt = Date.now();
        return;
      }

      state.items.unshift({
        ...action.payload,
        repetitions: 1,
        memorized: false,
        updatedAt: Date.now(),
      });
    },
    restoreMemorized(_state, action: PayloadAction<MemorizedState>) {
      return action.payload;
    },
  },
});

export const { toggleMemorizedAyah, recordMemorizationRepetition, restoreMemorized } = memorizedSlice.actions;
export default memorizedSlice.reducer;
