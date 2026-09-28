import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { KEYS, loadState } from '../persist';

export interface FavoritesState {
  items: string[];
}

const initialState = loadState<FavoritesState>(KEYS.favorites, { items: [] });

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    toggleFavorite(state, action: PayloadAction<string>) {
      state.items = state.items.includes(action.payload)
        ? state.items.filter((id) => id !== action.payload)
        : [...state.items, action.payload];
    },
    restoreFavorites(_state, action: PayloadAction<FavoritesState>) {
      return action.payload;
    },
  },
});

export const { toggleFavorite, restoreFavorites } = favoritesSlice.actions;
export default favoritesSlice.reducer;