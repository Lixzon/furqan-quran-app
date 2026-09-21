import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ScriptStyle, SettingsState } from '../../types';
import { loadState } from '../persist';
import { KEYS } from '../persist';
import { DEFAULT_ARABIC_SCALE, DEFAULT_RECITER } from '../../lib/constants';

const initialState: SettingsState = loadState<SettingsState>(KEYS.settings, {
  showArabic: true,
  showTransliteration: true,
  showTranslation: true,
  arabicFontScale: DEFAULT_ARABIC_SCALE,
  script: 'uthmani',
  readingMode: false,
  defaultReciter: DEFAULT_RECITER,
  followAudio: true,
  notifications: {
    daily: false,
    fridayKahf: false,
    nightlyMulk: false,
    reminderTime: '20:00',
  },
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
    setNotificationPreference(
      state,
      action: PayloadAction<{ key: 'daily' | 'fridayKahf' | 'nightlyMulk'; enabled: boolean }>,
    ) {
      state.notifications[action.payload.key] = action.payload.enabled;
    },
    setReminderTime(state, action: PayloadAction<string>) {
      state.notifications.reminderTime = action.payload;
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
  setNotificationPreference,
  setReminderTime,
} = settingsSlice.actions;
export default settingsSlice.reducer;
