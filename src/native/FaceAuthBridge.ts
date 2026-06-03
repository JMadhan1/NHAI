import { NativeModules } from 'react-native';
import type { NativeFaceAuthModule, LivenessChallenge, FaceEmbedding } from '../types';

const { FaceAuthModule } = NativeModules;

const MockFaceAuthModule: NativeFaceAuthModule = {
  initialize: async () => {
    console.warn('[VisorAI] Native TFLite module not linked — running in demo mode.');
    return true;
  },

  detectFace: async (_base64: string) => {
    await new Promise(r => setTimeout(r, 120));
    return { detected: true };
  },

  computeEmbedding: async (_base64: string) => {
    await new Promise(r => setTimeout(r, 180));
    const seed = _base64.length + (_base64.charCodeAt(0) ?? 0) + (_base64.charCodeAt(100) ?? 0);
    const rng = (i: number) => {
      const x = Math.sin(seed * 9301 + i * 49297 + 233) * 6_364_136;
      return x - Math.floor(x);
    };
    const raw = Array.from({ length: 192 }, (_, i) => rng(i) * 2 - 1);
    const norm = Math.sqrt(raw.reduce((s, v) => s + v * v, 0)) || 1;
    return { embedding: raw.map(v => v / norm) };
  },

  matchEmbedding: async (_embedding: number[], storedEmbeddings: FaceEmbedding[]) => {
    if (storedEmbeddings.length === 0) {
      return { matched: false, confidence: 0 };
    }
    const confidence = 0.87 + Math.random() * 0.10;
    return {
      matched: true,
      userId: storedEmbeddings[0].userId,
      confidence,
    };
  },

  computeLandmarks: async (_base64: string) => ({
    landmarks: {
      leftEye: Array.from({ length: 6 }, (_, i) => ({ x: 0.3 + i * 0.01, y: 0.4 })),
      rightEye: Array.from({ length: 6 }, (_, i) => ({ x: 0.6 + i * 0.01, y: 0.4 })),
      mouth: Array.from({ length: 8 }, (_, i) => ({ x: 0.4 + i * 0.02, y: 0.7 })),
      nose: { x: 0.5, y: 0.55 },
      headPose: { yaw: 0, pitch: 0, roll: 0 },
    },
    error: undefined,
  }),
};

export const NativeFaceAuth: NativeFaceAuthModule = FaceAuthModule ?? MockFaceAuthModule;

if (!FaceAuthModule) {
  console.warn('[VisorAI] FaceAuthModule not found — using demo mock (authentication will work in simulation mode).');
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
