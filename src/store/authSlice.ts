import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthResult, LivenessChallenge } from '../types';

interface AuthState {
  isInitialized: boolean;
  currentChallenge: LivenessChallenge | null;
  challengeProgress: LivenessChallenge[];
  lastResult: AuthResult | null;
  isProcessing: boolean;
  cameraActive: boolean;
}

const initialState: AuthState = {
  isInitialized: false,
  currentChallenge: null,
  challengeProgress: [],
  lastResult: null,
  isProcessing: false,
  cameraActive: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setInitialized(state, action: PayloadAction<boolean>) {
      state.isInitialized = action.payload;
    },
    setCurrentChallenge(state, action: PayloadAction<LivenessChallenge | null>) {
      state.currentChallenge = action.payload;
    },
    addChallengeProgress(state, action: PayloadAction<LivenessChallenge>) {
      state.challengeProgress.push(action.payload);
    },
    resetChallengeProgress(state) {
      state.challengeProgress = [];
    },
    setLastResult(state, action: PayloadAction<AuthResult | null>) {
      state.lastResult = action.payload;
    },
    setProcessing(state, action: PayloadAction<boolean>) {
      state.isProcessing = action.payload;
    },
    setCameraActive(state, action: PayloadAction<boolean>) {
      state.cameraActive = action.payload;
    },
  },
});

export const {
  setInitialized,
  setCurrentChallenge,
  addChallengeProgress,
  resetChallengeProgress,
  setLastResult,
  setProcessing,
  setCameraActive,
} = authSlice.actions;

export default authSlice.reducer;
