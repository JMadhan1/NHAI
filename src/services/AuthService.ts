import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeFaceAuth, computeCosineSimilarity, selectRandomChallenges } from '../native/FaceAuthBridge';
import { getAllEmbeddings, saveAuthAttempt, saveEmbedding } from './StorageService';
import { CONSTANTS } from '../utils/constants';
import type { AuthResult, FaceEmbedding, LivenessResult, LivenessChallenge } from '../types';

async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(CONSTANTS.DEVICE_ID_KEY);
  if (!id) {
    id = uuidv4();
    await AsyncStorage.setItem(CONSTANTS.DEVICE_ID_KEY, id);
  }
  return id;
}

export async function initializeFaceAuth(): Promise<boolean> {
  try {
    return await NativeFaceAuth.initialize();
  } catch (err) {
    console.error('[VisorAI] Failed to initialize FaceAuth:', err);
    return false;
  }
}

export async function enrollUser(
  userId: string,
  userName: string,
  frameBase64: string,
  gps?: { lat: number; lng: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    let detectionOk = false;
    try {
      const detection = await NativeFaceAuth.detectFace(frameBase64);
      detectionOk = detection.detected;
    } catch {
      detectionOk = true;
    }

    if (!detectionOk) {
      console.warn('[Enrollment] Face detection returned false — attempting embedding anyway.');
    }

    const embResult = await NativeFaceAuth.computeEmbedding(frameBase64);
    if (!embResult.embedding || embResult.embedding.length === 0) {
      return { success: false, error: embResult.error || 'Failed to compute face embedding. Please try again with better lighting.' };
    }

    const existing = await getAllEmbeddings();
    for (const stored of existing) {
      if (stored.userId === userId) continue;
      const sim = computeCosineSimilarity(embResult.embedding, stored.vector);
      if (sim > CONSTANTS.EMBEDDING_MATCH_THRESHOLD) {
        return { success: false, error: 'This face appears to be enrolled under a different user ID.' };
      }
    }

    const embedding: FaceEmbedding = {
      id: uuidv4(),
      userId,
      userName,
      vector: embResult.embedding,
      enrolledAt: Date.now(),
      enrolledGps: gps,
    };
    await saveEmbedding(embedding);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Enrollment failed. Please try again.' };
  }
}

export async function authenticateUser(
  frameBase64: string,
  livenessResult: LivenessResult,
  gps?: { lat: number; lng: number }
): Promise<AuthResult> {
  const deviceId = await getDeviceId();
  const attemptId = uuidv4();

  if (!livenessResult.passed) {
    await saveAuthAttempt({
      id: attemptId, userId: null, timestamp: Date.now(),
      result: 'FAIL_LIVENESS', confidence: 0,
      livenessScore: livenessResult.score, gps, deviceId, synced: false,
    });
    return { success: false, confidence: 0, liveness: livenessResult, attemptId, errorCode: 'LIVENESS_FAIL' };
  }

  const storedEmbeddings = await getAllEmbeddings();
  if (storedEmbeddings.length === 0) {
    return { success: false, confidence: 0, liveness: livenessResult, attemptId, errorCode: 'NO_MATCH' };
  }

  let detectionOk = true;
  try {
    const det = await NativeFaceAuth.detectFace(frameBase64);
    detectionOk = det.detected;
  } catch { detectionOk = true; }

  if (!detectionOk) {
    await saveAuthAttempt({
      id: attemptId, userId: null, timestamp: Date.now(),
      result: 'FAIL_NO_FACE', confidence: 0,
      livenessScore: livenessResult.score, gps, deviceId, synced: false,
    });
    return { success: false, confidence: 0, liveness: livenessResult, attemptId, errorCode: 'NO_FACE' };
  }

  const embResult = await NativeFaceAuth.computeEmbedding(frameBase64);
  if (!embResult.embedding || embResult.embedding.length === 0) {
    return { success: false, confidence: 0, liveness: livenessResult, attemptId, errorCode: 'MODEL_ERROR' };
  }

  let bestMatch: FaceEmbedding | null = null;
  let bestSimilarity = 0;

  for (const stored of storedEmbeddings) {
    const similarity = computeCosineSimilarity(embResult.embedding, stored.vector);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = stored;
    }
  }

  const threshold = CONSTANTS.EMBEDDING_MATCH_THRESHOLD;
  const matched = bestSimilarity >= threshold;

  await saveAuthAttempt({
    id: attemptId,
    userId: matched ? bestMatch!.userId : null,
    timestamp: Date.now(),
    result: matched ? 'SUCCESS' : 'FAIL_NO_MATCH',
    confidence: bestSimilarity,
    livenessScore: livenessResult.score,
    gps, deviceId, synced: false,
  });

  return {
    success: matched,
    userId: matched ? bestMatch!.userId : undefined,
    userName: matched ? bestMatch!.userName : undefined,
    confidence: bestSimilarity,
    liveness: livenessResult,
    attemptId,
    errorCode: matched ? undefined : 'NO_MATCH',
  };
}

export function getRandomChallenges(): LivenessChallenge[] {
  return selectRandomChallenges(CONSTANTS.LIVENESS_CHALLENGE_COUNT);
}
