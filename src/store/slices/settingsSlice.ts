import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ScriptStyle, SettingsState } from '../../types';
import { loadState } from '../persist';
import { KEYS } from '../persist';
import { DEFAULT_RECITER } from '../../lib/constants';

const initialState: SettingsState = loadState<SettingsState>(KEYS.settings, {
  showArabic: true,
  showTransliteration: true,
  showTranslation: true,
  arabicFontScale: 1.8,
  script: 'uthmani',
  readingMode: false,
  defaultReciter: DEFAULT_RECITER,
  followAudio: true,
});

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setShowArabic(state, action: PayloadAction<boolean>) {
      state.showArabic = action.payload;
    },
    setShowTransliteration(state, action: PayloadAction<boolean>) {
      state.showTransliteration = action.payload;
    },
    setShowTranslation(state, action: PayloadAction<boolean>) {
      state.showTranslation = action.payload;
    },
    setArabicFontScale(state, action: PayloadAction<number>) {
      state.arabicFontScale = Math.min(3, Math.max(1, action.payload));
    },
    setScript(state, action: PayloadAction<ScriptStyle>) {
      state.script = action.payload;
    },
    setReadingMode(state, action: PayloadAction<boolean>) {
      state.readingMode = action.payload;
    },
    setDefaultReciter(state, action: PayloadAction<string>) {
      state.defaultReciter = action.payload;
    },
    setFollowAudio(state, action: PayloadAction<boolean>) {
      state.followAudio = action.payload;
    },
  },
});

export const {
  setShowArabic,
  setShowTransliteration,
  setShowTranslation,
  setArabicFontScale,
  setScript,
  setReadingMode,
  setDefaultReciter,
  setFollowAudio,
} = settingsSlice.actions;
export default settingsSlice.reducer;
