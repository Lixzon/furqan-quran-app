import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AccentId, ThemeMode, ThemeState } from '../../types';
import { loadState } from '../persist';
import { KEYS } from '../persist';
import { DEFAULT_ACCENT } from '../../lib/constants';

const initialState: ThemeState = loadState<ThemeState>(KEYS.theme, {
  mode: 'system',
  accent: DEFAULT_ACCENT,
});

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
    },
    setAccent(state, action: PayloadAction<AccentId>) {
      state.accent = action.payload;
    },
  },
});

export const { setMode, setAccent } = themeSlice.actions;
export default themeSlice.reducer;
