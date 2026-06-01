import { NativeModules, Platform } from 'react-native';
import type { NativeFaceAuthModule, FaceEmbedding, AuthResult, LivenessChallenge } from '../types';

const { FaceAuthModule } = NativeModules;

if (!FaceAuthModule) {
  throw new Error('FaceAuthModule native module not found. Make sure native build is linked.');
}

export const NativeFaceAuth: NativeFaceAuthModule = FaceAuthModule;

export function computeEAR(eyeLandmarks: { x: number; y: number }[]): number {
  if (eyeLandmarks.length < 6) return 1.0;
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  const vertical1 = dist(eyeLandmarks[1], eyeLandmarks[5]);
  const vertical2 = dist(eyeLandmarks[2], eyeLandmarks[4]);
  const horizontal = dist(eyeLandmarks[0], eyeLandmarks[3]);
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

export function computeMAR(mouthLandmarks: { x: number; y: number }[]): number {
  if (mouthLandmarks.length < 8) return 0.0;
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  const vertical = dist(mouthLandmarks[2], mouthLandmarks[6]);
  const horizontal = dist(mouthLandmarks[0], mouthLandmarks[4]);
  return vertical / horizontal;
}

export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function selectRandomChallenges(count: number): LivenessChallenge[] {
  const all: LivenessChallenge[] = ['BLINK', 'SMILE', 'TURN_LEFT', 'TURN_RIGHT', 'NOD'];
  const shuffled = all.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function computeHeadPose(
  faceLandmarks: { x: number; y: number }[]
): { yaw: number; pitch: number; roll: number } {
  if (faceLandmarks.length < 468) {
    return { yaw: 0, pitch: 0, roll: 0 };
  }

  const nose = faceLandmarks[1];
  const leftEyeOuter = faceLandmarks[33];
  const rightEyeOuter = faceLandmarks[263];
  const mouthLeft = faceLandmarks[61];
  const mouthRight = faceLandmarks[291];

  const eyeDistance = Math.sqrt(
    Math.pow(rightEyeOuter.x - leftEyeOuter.x, 2) +
    Math.pow(rightEyeOuter.y - leftEyeOuter.y, 2)
  );

  const eyeCenter = {
    x: (leftEyeOuter.x + rightEyeOuter.x) / 2,
    y: (leftEyeOuter.y + rightEyeOuter.y) / 2,
  };

  const mouthCenter = {
    x: (mouthLeft.x + mouthRight.x) / 2,
    y: (mouthLeft.y + mouthRight.y) / 2,
  };

  const yaw = Math.atan2(nose.x - eyeCenter.x, eyeDistance) * (180 / Math.PI);
  const pitch = Math.atan2(nose.y - eyeCenter.y, eyeDistance) * (180 / Math.PI);
  const roll = Math.atan2(mouthRight.y - mouthLeft.y, mouthRight.x - mouthLeft.x) * (180 / Math.PI);

  return { yaw, pitch, roll };
}
