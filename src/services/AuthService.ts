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
    console.error('Failed to initialize FaceAuth:', err);
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
    const detection = await NativeFaceAuth.detectFace(frameBase64);
    if (!detection.detected) {
      return { success: false, error: 'No face detected in frame. Please center your face.' };
    }

    const embResult = await NativeFaceAuth.computeEmbedding(frameBase64);
    if (embResult.error || !embResult.embedding) {
      return { success: false, error: embResult.error || 'Failed to compute face embedding.' };
    }

    const existing = await getAllEmbeddings();
    for (const stored of existing) {
      const sim = computeCosineSimilarity(embResult.embedding, stored.vector);
      if (sim > CONSTANTS.EMBEDDING_MATCH_THRESHOLD && stored.userId !== userId) {
        return { success: false, error: 'This face appears to already be enrolled under a different user.' };
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
    return { success: false, error: err.message || 'Enrollment failed' };
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
    const attempt = {
      id: attemptId,
      userId: null,
      timestamp: Date.now(),
      result: 'FAIL_LIVENESS' as const,
      confidence: 0,
      livenessScore: livenessResult.score,
      gps,
      deviceId,
      synced: false,
    };
    await saveAuthAttempt(attempt);
    return {
      success: false,
      confidence: 0,
      liveness: livenessResult,
      attemptId,
      errorCode: 'LIVENESS_FAIL',
    };
  }

  const detection = await NativeFaceAuth.detectFace(frameBase64);
  if (!detection.detected) {
    const attempt = {
      id: attemptId,
      userId: null,
      timestamp: Date.now(),
      result: 'FAIL_NO_FACE' as const,
      confidence: 0,
      livenessScore: livenessResult.score,
      gps,
      deviceId,
      synced: false,
    };
    await saveAuthAttempt(attempt);
    return { success: false, confidence: 0, liveness: livenessResult, attemptId, errorCode: 'NO_FACE' };
  }

  const embResult = await NativeFaceAuth.computeEmbedding(frameBase64);
  if (embResult.error || !embResult.embedding) {
    return { success: false, confidence: 0, liveness: livenessResult, attemptId, errorCode: 'MODEL_ERROR' };
  }

  const storedEmbeddings = await getAllEmbeddings();
  let bestMatch: FaceEmbedding | null = null;
  let bestSimilarity = 0;

  for (const stored of storedEmbeddings) {
    const similarity = computeCosineSimilarity(embResult.embedding, stored.vector);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = stored;
    }
  }

  const matched = bestSimilarity >= CONSTANTS.EMBEDDING_MATCH_THRESHOLD;
  const attempt = {
    id: attemptId,
    userId: matched ? bestMatch!.userId : null,
    timestamp: Date.now(),
    result: matched ? 'SUCCESS' as const : 'FAIL_NO_MATCH' as const,
    confidence: bestSimilarity,
    livenessScore: livenessResult.score,
    gps,
    deviceId,
    synced: false,
  };
  await saveAuthAttempt(attempt);

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
