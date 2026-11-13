import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { KEYS, loadState } from '../persist';

export interface GuidanceState {
  fastingDays: Record<string, true>;
  reflections: Record<string, string>;
}

const initialState = loadState<GuidanceState>(KEYS.guidance, {
  fastingDays: {},
  reflections: {},
});

const guidanceSlice = createSlice({
  name: 'guidance',
  initialState,
  reducers: {
    restoreGuidance(_state, action: PayloadAction<GuidanceState>) {
      return action.payload;
    },
    toggleFastDay(state, action: PayloadAction<string>) {
      const date = action.payload;
      if (state.fastingDays[date]) delete state.fastingDays[date];
      else state.fastingDays[date] = true;
    },
    saveDailyReflection(state, action: PayloadAction<{ date: string; text: string }>) {
      const { date, text } = action.payload;
      if (text.trim()) state.reflections[date] = text.slice(0, 2000);
      else delete state.reflections[date];
    },
  },
});

export const { restoreGuidance, toggleFastDay, saveDailyReflection } = guidanceSlice.actions;
export default guidanceSlice.reducer;
