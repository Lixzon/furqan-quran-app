import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { VoiceMatchResult } from '../../lib/recitationSearch';

export interface SearchSessionState {
  matches: VoiceMatchResult[];
  activeIndex: number;
  isOpen: boolean;
  lastQuery: string;
}

const initialState: SearchSessionState = {
  matches: [],
  activeIndex: 0,
  isOpen: false,
  lastQuery: '',
};

const searchSessionSlice = createSlice({
  name: 'searchSession',
  initialState,
  reducers: {
    setVoiceMatchSession(
      state,
      action: PayloadAction<{ matches: VoiceMatchResult[]; activeIndex?: number; isOpen?: boolean; lastQuery?: string }>,
    ) {
      const payload = action.payload;
      state.matches = payload.matches;
      state.activeIndex = payload.activeIndex ?? 0;
      state.isOpen = payload.isOpen ?? state.matches.length > 0;
      state.lastQuery = payload.lastQuery ?? state.lastQuery;
    },
    setActiveVoiceMatchIndex(state, action: PayloadAction<number>) {
      state.activeIndex = action.payload;
    },
    openVoiceMatchDrawer(state) {
      state.isOpen = true;
    },
    closeVoiceMatchDrawer(state) {
      state.isOpen = false;
    },
    clearVoiceMatchSession(state) {
      state.matches = [];
      state.activeIndex = 0;
      state.isOpen = false;
      state.lastQuery = '';
    },
  },
});

export const {
  setVoiceMatchSession,
  setActiveVoiceMatchIndex,
  openVoiceMatchDrawer,
  closeVoiceMatchDrawer,
  clearVoiceMatchSession,
} = searchSessionSlice.actions;

export default searchSessionSlice.reducer;
