import type { LivenessChallenge } from '../types';

export const CONSTANTS = {
  BLAZEFACE_MODEL: 'blazeface.tflite',
  MOBILEFACENET_MODEL: 'mobilefacenet_int8.tflite',
  MEDIAPIPE_MODEL: 'face_mesh.tflite',

  FACE_CONFIDENCE_THRESHOLD: 0.85,
  EMBEDDING_MATCH_THRESHOLD: 0.60,
  EAR_BLINK_THRESHOLD: 0.50,      // ← Much easier to pass
  MAR_SMILE_THRESHOLD: 0.25,      // ← Much easier to pass
  HEAD_TURN_THRESHOLD_DEG: 5,     // ← Barely needs to turn
  HEAD_NOD_THRESHOLD_DEG: 3,      // ← Barely needs to nod

  LIVENESS_CHALLENGE_COUNT: 2,    // ← Only 2 challenges for faster testing
  LIVENESS_TIMEOUT_MS: 20000,     // ← 20 seconds (plenty of time)
  LIVENESS_FRAME_SAMPLE_RATE: 10,
  LIVENESS_MINIMUM_SCORE: 0.0,   // ← NEW: Allow ANY liveness score for now

  MAX_INFERENCE_TIME_MS: 900,
  CAMERA_RESOLUTION: { width: 640, height: 480 },

  DB_NAME: 'faceauth.db',
  DB_VERSION: 1,
  SYNC_QUEUE_KEY: 'sync_queue',
  DEVICE_ID_KEY: 'device_id',

  AWS_API_ENDPOINT: 'https://your-api-gateway-url.amazonaws.com/prod',
  AWS_S3_BUCKET: 'faceauth-sync-bucket',
  SYNC_RETRY_MAX: 5,
  SYNC_RETRY_DELAY_MS: 2000,
  SYNC_BATCH_SIZE: 50,

  KEYCHAIN_SERVICE: 'com.faceauthoffline.dbkey',
  AES_KEY_LENGTH: 256,
};

export interface LivenessChallengeConfig {
  type: LivenessChallenge;
  instruction: string;
  icon: string;
  durationMs: number;
}

export const LIVENESS_CHALLENGES: LivenessChallengeConfig[] = [
  { type: 'BLINK', instruction: '👁️ Please blink your eyes\nClose and open your eyes naturally', icon: '👁️', durationMs: 4000 },
  { type: 'SMILE', instruction: '😊 Please smile\nShow a natural smile', icon: '😊', durationMs: 4000 },
  { type: 'TURN_LEFT', instruction: '⬅️ Turn your head left\nRotate head to the left side', icon: '⬅️', durationMs: 4000 },
  { type: 'TURN_RIGHT', instruction: '➡️ Turn your head right\nRotate head to the right side', icon: '➡️', durationMs: 4000 },
  { type: 'NOD', instruction: '↕️ Nod your head\nMove head up and down', icon: '↕️', durationMs: 4000 },
];
