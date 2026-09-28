import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { KEYS, loadState } from '../persist';

export interface AyahBookmark {
  id: string;
  surah: number;
  ayah: number;
  surahName: string;
  arabic: string;
  translation: string;
  note: string;
  createdAt: number;
}

export interface BookmarksState {
  items: AyahBookmark[];
}

const initialState = loadState<BookmarksState>(KEYS.bookmarks, { items: [] });

const bookmarksSlice = createSlice({
  name: 'bookmarks',
  initialState,
  reducers: {
    toggleAyahBookmark(state, action: PayloadAction<Omit<AyahBookmark, 'note' | 'createdAt'>>) {
      const existing = state.items.findIndex((item) => item.id === action.payload.id);
      if (existing >= 0) {
        state.items.splice(existing, 1);
      } else {
        state.items.unshift({ ...action.payload, note: '', createdAt: Date.now() });
      }
    },
    setBookmarkNote(state, action: PayloadAction<{ id: string; note: string }>) {
      const item = state.items.find((bookmark) => bookmark.id === action.payload.id);
      if (item) item.note = action.payload.note;
    },
    removeBookmark(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    restoreBookmarks(_state, action: PayloadAction<BookmarksState>) {
      return action.payload;
    },
  },
});

export const { toggleAyahBookmark, setBookmarkNote, removeBookmark, restoreBookmarks } = bookmarksSlice.actions;
export default bookmarksSlice.reducer;