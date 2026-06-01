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

export interface SyncQueueItem {
  id: string;
  type: 'AUTH_ATTEMPT' | 'ENROLLMENT';
  payload: AuthAttempt | FaceEmbedding;
  createdAt: number;
  retryCount: number;
}

export interface FaceLandmarks {
  leftEye: { x: number; y: number }[];
  rightEye: { x: number; y: number }[];
  mouth: { x: number; y: number }[];
  nose: { x: number; y: number };
  headPose: { yaw: number; pitch: number; roll: number };
}

export interface NativeFaceAuthModule {
  initialize(): Promise<boolean>;
  detectFace(base64Image: string): Promise<{ detected: boolean; boundingBox?: BoundingBox }>;
  computeEmbedding(base64Image: string): Promise<{ embedding: number[]; error?: string }>;
  matchEmbedding(embedding: number[], storedEmbeddings: FaceEmbedding[]): Promise<{ matched: boolean; userId?: string; confidence: number }>;
  computeLandmarks(base64Image: string): Promise<{ landmarks: FaceLandmarks; error?: string }>;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
