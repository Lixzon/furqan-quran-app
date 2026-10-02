import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AssistantLayout, DownloadQuality, ScriptStyle, SettingsState } from '../../types';
import { loadState } from '../persist';
import { KEYS } from '../persist';
import { DEFAULT_ARABIC_SCALE, DEFAULT_DOWNLOAD_QUALITY, DEFAULT_RECITER } from '../../lib/constants';

const initialState: SettingsState = loadState<SettingsState>(KEYS.settings, {
  showArabic: true,
  showTransliteration: true,
  showTranslation: true,
  arabicFontScale: DEFAULT_ARABIC_SCALE,
  script: 'uthmani',
  readingMode: false,
  defaultReciter: DEFAULT_RECITER,
  downloadQuality: DEFAULT_DOWNLOAD_QUALITY,
  followAudio: true,
  audioSyncOffsetMs: 0,
  hasOfferedDefaultReciterDownload: false,
  wifiDownloadPending: false,
  assistantLayout: 'classic',
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
    restoreSettings(_state, action: PayloadAction<SettingsState>) {
      // Backups written before a field existed would otherwise restore undefined.
      return {
        ...action.payload,
        downloadQuality: action.payload.downloadQuality ?? DEFAULT_DOWNLOAD_QUALITY,
        assistantLayout: action.payload.assistantLayout ?? 'classic',
        audioSyncOffsetMs: Number.isFinite(action.payload.audioSyncOffsetMs) ? action.payload.audioSyncOffsetMs : 0,
      };
    },
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
    setDownloadQuality(state, action: PayloadAction<DownloadQuality>) {
      state.downloadQuality = action.payload;
    },
    setFollowAudio(state, action: PayloadAction<boolean>) {
      state.followAudio = action.payload;
    },
    setAudioSyncOffset(state, action: PayloadAction<number>) {
      const ms = Math.round(action.payload) || 0;
      state.audioSyncOffsetMs = Math.max(-5000, Math.min(5000, ms));
    },
    setDefaultReciterOfferSeen(state) {
      state.hasOfferedDefaultReciterDownload = true;
    },
    setWifiDownloadPending(state, action: PayloadAction<boolean>) {
      state.wifiDownloadPending = action.payload;
    },
    setAssistantLayout(state, action: PayloadAction<AssistantLayout>) {
      state.assistantLayout = action.payload;
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
  restoreSettings,
  setShowArabic,
  setShowTransliteration,
  setShowTranslation,
  setArabicFontScale,
  setScript,
  setReadingMode,
  setDefaultReciter,
  setDownloadQuality,
  setFollowAudio,
  setAudioSyncOffset,
  setDefaultReciterOfferSeen,
  setWifiDownloadPending,
  setAssistantLayout,
  setNotificationPreference,
  setReminderTime,
} = settingsSlice.actions;
export default settingsSlice.reducer;
