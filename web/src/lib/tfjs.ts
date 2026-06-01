import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-wasm';
import * as faceApi from 'face-api.js';

let isInitialized = false;

export async function initializeTFLite(): Promise<boolean> {
  try {
    if (isInitialized) return true;

    // Set WebGL backend
    await tf.setBackend('webgl');
    await tf.ready();

    // Load face-api models
    const MODEL_URL = '/models/';
    await Promise.all([
      faceApi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceApi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceApi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceApi.nets.ageGenderNet.loadFromUri(MODEL_URL),
    ]);

    isInitialized = true;
    console.log('TensorFlow.js initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize TensorFlow.js:', error);
    return false;
  }
}

export async function detectFace(
  input: HTMLImageElement | HTMLVideoElement
): Promise<faceApi.Detection[]> {
  try {
    const detections = await faceApi.detectAllFaces(input);
    return detections;
  } catch (error) {
    console.error('Face detection error:', error);
    return [];
  }
}

export async function computeLandmarks(
  input: HTMLImageElement | HTMLVideoElement
): Promise<faceApi.WithFaceLandmarks<faceApi.Detection> | null> {
  try {
    const detectionsWithLandmarks = await faceApi
      .detectSingleFace(input)
      .withFaceLandmarks();
    return detectionsWithLandmarks || null;
  } catch (error) {
    console.error('Landmark computation error:', error);
    return null;
  }
}

export async function computeEmbedding(
  input: HTMLImageElement | HTMLVideoElement
): Promise<Float32Array | null> {
  try {
    const detections = await faceApi
      .detectSingleFace(input)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections && detections.descriptor) {
      return detections.descriptor;
    }
    return null;
  } catch (error) {
    console.error('Embedding computation error:', error);
    return null;
  }
}

export function computeCosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function computeEAR(
  landmarks: [{ x: number; y: number }, { x: number; y: number }][]
): number {
  if (landmarks.length < 6) return 1.0;
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

  const vertical1 = dist(landmarks[1][0], landmarks[5][0]);
  const vertical2 = dist(landmarks[2][0], landmarks[4][0]);
  const horizontal = dist(landmarks[0][0], landmarks[3][0]);

  return (vertical1 + vertical2) / (2.0 * horizontal);
}

export async function detectExpressions(
  input: HTMLImageElement | HTMLVideoElement
): Promise<{ smile: number; neutral: number }> {
  try {
    const detections = await faceApi.detectSingleFace(input).withFaceExpressions();
    if (detections && detections.expressions) {
      return {
        smile: detections.expressions.happy || 0,
        neutral: detections.expressions.neutral || 0,
      };
    }
    return { smile: 0, neutral: 0 };
  } catch (error) {
    console.error('Expression detection error:', error);
    return { smile: 0, neutral: 0 };
  }
}

export function dispose(): void {
  tf.disposeVariables();
}
