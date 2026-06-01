// Shared types between mobile and web

export type LivenessChallenge = 'BLINK' | 'SMILE' | 'TURN_LEFT' | 'TURN_RIGHT' | 'NOD';

export interface FaceEmbedding {
  id: string;
  userId: string;
  userName: string;
  vector: number[];
  enrolledAt: number;
  enrolledGps?: { lat: number; lng: number };
}

export interface AuthAttempt {
  id: string;
  userId: string | null;
  timestamp: number;
  result: 'SUCCESS' | 'FAIL_LIVENESS' | 'FAIL_NO_MATCH' | 'FAIL_NO_FACE';
  confidence: number;
  livenessScore: number;
  gps?: { lat: number; lng: number };
  deviceId: string;
  synced: boolean;
}

export interface LivenessResult {
  passed: boolean;
  challengesPassed: LivenessChallenge[];
  challengesFailed: LivenessChallenge[];
  score: number;
  durationMs: number;
}

export interface AuthResult {
  success: boolean;
  userId?: string;
  userName?: string;
  confidence: number;
  liveness: LivenessResult;
  attemptId: string;
  errorCode?: 'NO_FACE' | 'LIVENESS_FAIL' | 'NO_MATCH' | 'MODEL_ERROR';
}

export interface FaceLandmarks {
  leftEye: { x: number; y: number }[];
  rightEye: { x: number; y: number }[];
  mouth: { x: number; y: number }[];
  nose: { x: number; y: number };
  headPose: { yaw: number; pitch: number; roll: number };
}

export interface SystemStatus {
  isOnline: boolean;
  pendingSync: number;
  lastSync?: number;
  enrolledUsers: number;
}

export interface WebAuthState {
  isProcessing: boolean;
  currentChallenge: LivenessChallenge | null;
  lastResult: AuthResult | null;
  cameraActive: boolean;
}
