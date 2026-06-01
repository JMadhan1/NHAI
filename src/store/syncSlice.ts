import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  isSyncing: boolean;
  lastSyncError: string | null;
}

const initialState: SyncState = {
  isOnline: false,
  pendingCount: 0,
  lastSyncAt: null,
  isSyncing: false,
  lastSyncError: null,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setOnline(state, action: PayloadAction<boolean>) {
      state.isOnline = action.payload;
    },
    setPendingCount(state, action: PayloadAction<number>) {
      state.pendingCount = action.payload;
    },
    setSyncing(state, action: PayloadAction<boolean>) {
      state.isSyncing = action.payload;
    },
    setSyncComplete(state, action: PayloadAction<{ at: number; error?: string }>) {
      state.lastSyncAt = action.payload.at;
      state.isSyncing = false;
      state.lastSyncError = action.payload.error || null;
    },
  },
});

export const { setOnline, setPendingCount, setSyncing, setSyncComplete } = syncSlice.actions;

export default syncSlice.reducer;
