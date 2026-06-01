import { create } from 'zustand';
import type { AuthResult, LivenessChallenge, FaceEmbedding } from '@/types';

interface AuthStore {
  // State
  isProcessing: boolean;
  currentChallenge: LivenessChallenge | null;
  lastResult: AuthResult | null;
  enrolledUsers: FaceEmbedding[];
  cameraActive: boolean;

  // Actions
  setProcessing: (processing: boolean) => void;
  setCurrentChallenge: (challenge: LivenessChallenge | null) => void;
  setLastResult: (result: AuthResult | null) => void;
  setEnrolledUsers: (users: FaceEmbedding[]) => void;
  setCameraActive: (active: boolean) => void;
  addEnrolledUser: (user: FaceEmbedding) => void;
  removeEnrolledUser: (userId: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isProcessing: false,
  currentChallenge: null,
  lastResult: null,
  enrolledUsers: [],
  cameraActive: false,

  setProcessing: (processing) => set({ isProcessing: processing }),
  setCurrentChallenge: (challenge) => set({ currentChallenge: challenge }),
  setLastResult: (result) => set({ lastResult: result }),
  setEnrolledUsers: (users) => set({ enrolledUsers: users }),
  setCameraActive: (active) => set({ cameraActive: active }),

  addEnrolledUser: (user) =>
    set((state) => ({
      enrolledUsers: [...state.enrolledUsers, user],
    })),

  removeEnrolledUser: (userId) =>
    set((state) => ({
      enrolledUsers: state.enrolledUsers.filter((u) => u.userId !== userId),
    })),
}));

interface SyncStore {
  // State
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  isSyncing: boolean;
  lastSyncError: string | null;

  // Actions
  setOnline: (online: boolean) => void;
  setPendingCount: (count: number) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncComplete: (at: number, error?: string) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  isOnline: false,
  pendingCount: 0,
  lastSyncAt: null,
  isSyncing: false,
  lastSyncError: null,

  setOnline: (online) => set({ isOnline: online }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setSyncComplete: (at, error) =>
    set({
      lastSyncAt: at,
      isSyncing: false,
      lastSyncError: error || null,
    }),
}));
