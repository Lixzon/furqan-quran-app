import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { uid } from '../../lib/utils';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  items: Toast[];
}

const initialState: ToastState = { items: [] };

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    push: {
      reducer(state, action: PayloadAction<Toast>) {
        state.items.push(action.payload);
        if (state.items.length > 4) state.items.shift();
      },
      prepare(message: string, kind: ToastKind = 'info') {
        return { payload: { id: uid('toast'), message, kind } };
      },
    },
    dismiss(state, action: PayloadAction<string>) {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
  },
});

export const { push, dismiss } = toastSlice.actions;
export default toastSlice.reducer;

export const selectToasts = (s: { toast: ToastState }) => s.toast.items;
