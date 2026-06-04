import { NativeModules } from 'react-native';
import type { NativeFaceAuthModule, LivenessChallenge } from '../types';

const { FaceAuthModule } = NativeModules;

// Only use real native module - no mock data fallback
export const NativeFaceAuth: NativeFaceAuthModule = FaceAuthModule;

if (!FaceAuthModule) {
  console.error('[VisorAI] ERROR: FaceAuthModule not found! Native face authentication is required. Please rebuild the app with native modules linked.');
  throw new Error('FaceAuthModule is required but not available. Ensure native modules are properly linked.');
}

export function computeEAR(eyeLandmarks: { x: number; y: number }[]): number {
  if (eyeLandmarks.length < 6) return 1.0;
  const d = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  const v1 = d(eyeLandmarks[1], eyeLandmarks[5]);
  const v2 = d(eyeLandmarks[2], eyeLandmarks[4]);
  const h = d(eyeLandmarks[0], eyeLandmarks[3]);
  return h < 0.0001 ? 1.0 : (v1 + v2) / (2 * h);
}

export function computeMAR(mouthLandmarks: { x: number; y: number }[]): number {
  if (mouthLandmarks.length < 8) return 0.0;
  const d = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  const v = d(mouthLandmarks[2], mouthLandmarks[6]);
  const h = d(mouthLandmarks[0], mouthLandmarks[4]);
  return h < 0.0001 ? 0.0 : v / h;
}

export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom < 1e-10 ? 0 : dot / denom;
}

export function selectRandomChallenges(count: number): LivenessChallenge[] {
  const all: LivenessChallenge[] = ['BLINK', 'SMILE', 'TURN_LEFT', 'TURN_RIGHT', 'NOD'];
  return [...all].sort(() => Math.random() - 0.5).slice(0, Math.min(count, all.length));
}

export function computeHeadPose(pts: { x: number; y: number }[]): { yaw: number; pitch: number; roll: number } {
  if (pts.length < 468) return { yaw: 0, pitch: 0, roll: 0 };
  const nose = pts[1];
  const le = pts[33]; const re = pts[263];
  const ml = pts[61]; const mr = pts[291];
  const ed = Math.sqrt((re.x - le.x) ** 2 + (re.y - le.y) ** 2);
  if (ed < 0.001) return { yaw: 0, pitch: 0, roll: 0 };
  const ec = { x: (le.x + re.x) / 2, y: (le.y + re.y) / 2 };
  return {
    yaw: Math.atan2(nose.x - ec.x, ed) * (180 / Math.PI),
    pitch: Math.atan2(nose.y - ec.y, ed) * (180 / Math.PI),
    roll: Math.atan2(mr.y - ml.y, mr.x - ml.x) * (180 / Math.PI),
  };
}
