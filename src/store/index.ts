import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';

import themeReducer from './slices/themeSlice';
import settingsReducer from './slices/settingsSlice';
import playlistReducer from './slices/playlistSlice';
import progressReducer from './slices/progressSlice';
import playerReducer from './slices/playerSlice';
import toastReducer from './slices/toastSlice';

import { saveState, KEYS } from './persist';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    settings: settingsReducer,
    playlists: playlistReducer,
    progress: progressReducer,
    player: playerReducer,
    toast: toastReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/* ---------- persist selected slices ---------- */

let lastSaved = new Map<string, string>();
store.subscribe(() => {
  const s = store.getState();
  const writers: [string, unknown][] = [
    [KEYS.theme, s.theme],
    [KEYS.settings, s.settings],
    [KEYS.playlists, s.playlists],
    [KEYS.progress, s.progress],
  ];
  for (const [key, value] of writers) {
    let next: string;
    try {
      next = JSON.stringify(value);
    } catch {
      continue;
    }
    if (lastSaved.get(key) === next) continue;
    lastSaved.set(key, next);
    saveState(key, value);
  }
});
