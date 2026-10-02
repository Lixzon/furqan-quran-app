import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AccentId, ThemeMode, ThemeState } from '../../types';
import { loadState } from '../persist';
import { KEYS } from '../persist';
import { DEFAULT_ACCENT } from '../../lib/constants';
import { resetSettings, setAccentColor, setThemeMode } from './settingsSlice';

const initialState: ThemeState = loadState<ThemeState>(KEYS.theme, {
  mode: 'system',
  accent: DEFAULT_ACCENT,
  customAccent: null,
});

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    restoreTheme(_state, action: PayloadAction<ThemeState>) {
      // Backups written before the custom accent existed have no field at all.
      return { ...action.payload, customAccent: action.payload.customAccent ?? null };
    },
    setMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
    },
    setAccent(state, action: PayloadAction<AccentId>) {
      state.accent = action.payload;
      // Picking a stock accent is an explicit move away from a custom one.
      state.customAccent = null;
    },
    setCustomAccent(state, action: PayloadAction<string | null>) {
      state.customAccent = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(setThemeMode, (state, action) => {
        state.mode = action.payload;
      })
      .addCase(setAccentColor, (state, action) => {
        state.accent = action.payload;
        state.customAccent = null;
      })
      .addCase(resetSettings, (state) => {
        state.mode = 'system';
        state.accent = DEFAULT_ACCENT;
        state.customAccent = null;
      });
  },
});

export const { restoreTheme, setMode, setAccent, setCustomAccent } = themeSlice.actions;
export default themeSlice.reducer;
