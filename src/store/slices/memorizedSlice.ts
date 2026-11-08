import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { KEYS, loadState } from '../persist';

export const MEMORIZATION_PLAY_THRESHOLD = 100;

export interface MemorizedAyah {
  id: string;
  surah: number;
  ayah: number;
  surahName: string;
  arabic: string;
  translation: string;
  repetitions: number;
  playCount: number;
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
        playCount: 0,
        memorized: true,
        updatedAt: Date.now(),
      });
    },
    recordMemorizationRepetition(state, action: PayloadAction<MemorizedAyahInfo>) {
      const existing = state.items.find((item) => item.id === action.payload.id);
      if (existing) {
        existing.repetitions += 1;
        existing.playCount ??= 0;
        existing.updatedAt = Date.now();
        return;
      }

      state.items.unshift({
        ...action.payload,
        repetitions: 1,
        playCount: 0,
        memorized: false,
        updatedAt: Date.now(),
      });
    },
    recordAyahPlay(state, action: PayloadAction<MemorizedAyahInfo>) {
      const existing = state.items.find((item) => item.id === action.payload.id);
      if (existing) {
        existing.playCount = (existing.playCount ?? 0) + 1;
        if (existing.playCount > MEMORIZATION_PLAY_THRESHOLD) existing.memorized = true;
        existing.updatedAt = Date.now();
        return;
      }

      state.items.unshift({
        ...action.payload,
        repetitions: 0,
        playCount: 1,
        memorized: false,
        updatedAt: Date.now(),
      });
    },
    mergeCloudMemorized(state, action: PayloadAction<MemorizedAyah>) {
      const remote = action.payload;
      const existing = state.items.find((item) => item.id === remote.id);
      if (!existing) {
        state.items.unshift({ ...remote });
        return;
      }
      const isRemoteNewer = remote.updatedAt > existing.updatedAt;
      if (isRemoteNewer) {
        existing.surahName = remote.surahName;
        existing.arabic = remote.arabic;
        existing.translation = remote.translation;
        existing.repetitions = remote.repetitions;
        existing.memorized = remote.memorized;
      }
      existing.playCount = Math.max(existing.playCount ?? 0, remote.playCount ?? 0);
      existing.updatedAt = Math.max(existing.updatedAt, remote.updatedAt);
      if (existing.playCount > MEMORIZATION_PLAY_THRESHOLD) existing.memorized = true;
    },
    restoreMemorized(_state, action: PayloadAction<MemorizedState>) {
      return {
        items: action.payload.items.map((item) => ({
          ...item,
          repetitions: Number.isFinite(item.repetitions) ? item.repetitions : 0,
          playCount: Number.isFinite(item.playCount) ? item.playCount : 0,
        })),
      };
    },
  },
});

export const {
  toggleMemorizedAyah,
  recordMemorizationRepetition,
  recordAyahPlay,
  mergeCloudMemorized,
  restoreMemorized,
} = memorizedSlice.actions;
export default memorizedSlice.reducer;
