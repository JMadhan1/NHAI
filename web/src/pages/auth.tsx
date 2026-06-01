import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore, useSyncStore } from '@/store/authStore';
import { detectFace, computeEmbedding, computeCosineSimilarity } from '@/lib/tfjs';
import { getAllEmbeddings, saveAuthAttempt } from '@/lib/storage';
import type { AuthAttempt, FaceEmbedding } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export default function AuthPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [authResult, setAuthResult] = useState<any>(null);
  const [enrolledUsers, setEnrolledUsers] = useState<FaceEmbedding[]>([]);
  const setProcessing = useAuthStore((state) => state.setProcessing);
  const isProcessing = useAuthStore((state) => state.isProcessing);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const embeddings = await getAllEmbeddings();
        setEnrolledUsers(embeddings);

        // Start face detection loop
        const interval = setInterval(detectFaceFrame, 500);
        return () => clearInterval(interval);
      } catch (error) {
        console.error('Camera access error:', error);
        alert('Camera access required for authentication');
      }
    };

    startCamera();
  }, []);

  const detectFaceFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    try {
      const detections = await detectFace(videoRef.current);
      setFaceDetected(detections.length > 0);
    } catch (error) {
      console.error('Face detection error:', error);
    }
  };

  const handleAuthenticate = async () => {
    if (!videoRef.current || enrolledUsers.length === 0) {
      alert('No enrolled users found. Please enroll a user first.');
      return;
    }

    setProcessing(true);

    try {
      const embedding = await computeEmbedding(videoRef.current);
      if (!embedding) {
        setAuthResult({
          success: false,
          errorCode: 'NO_FACE',
          message: 'No face detected in frame',
        });
        setProcessing(false);
        return;
      }

      let bestMatch: FaceEmbedding | null = null;
      let bestConfidence = 0;
      const THRESHOLD = 0.60;

      for (const stored of enrolledUsers) {
        const confidence = computeCosineSimilarity(
          embedding as unknown as Float32Array,
          new Float32Array(stored.vector)
        );
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = stored;
        }
      }

      const success = bestConfidence >= THRESHOLD;
      const attempt: AuthAttempt = {
        id: uuidv4(),
        userId: success ? bestMatch!.userId : null,
        timestamp: Date.now(),
        result: success ? 'SUCCESS' : 'FAIL_NO_MATCH',
        confidence: bestConfidence,
        livenessScore: 1.0, // Placeholder - implement liveness in next phase
        deviceId: 'web-' + (typeof window !== 'undefined' ? window.location.hostname : ''),
        synced: false,
      };

      await saveAuthAttempt(attempt);

      setAuthResult({
        success,
        userId: bestMatch?.userId,
        userName: bestMatch?.userName,
        confidence: bestConfidence,
        message: success
          ? `Authenticated as ${bestMatch?.userName}`
          : 'Face not recognized',
      });
    } catch (error) {
      console.error('Auth error:', error);
      setAuthResult({
        success: false,
        errorCode: 'MODEL_ERROR',
        message: 'Authentication failed due to model error',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Link href="/">
          <a className="text-blue-400 hover:text-blue-300 mb-6 inline-block">← Back</a>
        </Link>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h1 className="text-3xl font-bold text-white mb-4">Authentication</h1>

          {/* Camera Feed */}
          <div className="relative mb-6 bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-96 object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Face Detection Indicator */}
            <div className="absolute top-4 right-4 w-12 h-12 rounded-full border-2 flex items-center justify-center text-white font-bold bg-black/50">
              <div
                className={`w-full h-full rounded-full flex items-center justify-center ${
                  faceDetected ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                {faceDetected ? '✓' : '✗'}
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-4 left-4 right-4 text-white text-sm bg-black/50 p-2 rounded">
              {faceDetected ? 'Face detected ✓' : 'Position your face in the frame'}
            </div>
          </div>

          {/* Auth Result */}
          {authResult && (
            <div
              className={`mb-6 p-4 rounded-lg border ${
                authResult.success
                  ? 'bg-green-900/20 border-green-500 text-green-300'
                  : 'bg-red-900/20 border-red-500 text-red-300'
              }`}
            >
              <p className="font-bold mb-2">
                {authResult.success ? '✅ Authenticated' : '❌ Not Recognized'}
              </p>
              {authResult.userName && <p className="text-sm">User: {authResult.userName}</p>}
              <p className="text-sm">Confidence: {(authResult.confidence * 100).toFixed(1)}%</p>
              <p className="text-xs mt-2 opacity-75">{authResult.message}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleAuthenticate}
              disabled={!faceDetected || isProcessing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
            >
              {isProcessing ? 'Processing...' : 'Authenticate'}
            </button>

            {authResult && (
              <button
                onClick={() => setAuthResult(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition"
              >
                Try Again
              </button>
            )}
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-slate-700/50 rounded text-slate-300 text-sm">
            <p className="font-bold mb-2">Enrolled Users: {enrolledUsers.length}</p>
            <ul className="space-y-1">
              {enrolledUsers.map((user) => (
                <li key={user.userId}>- {user.userName}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
