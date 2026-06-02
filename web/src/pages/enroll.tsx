import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { computeEmbedding, detectFace } from '@/lib/tfjs';
import { saveEmbedding, getAllEmbeddings, computeCosineSimilarity } from '@/lib/storage';
import type { FaceEmbedding } from '@/types';
import { v4 as uuidv4 } from 'uuid';

type EnrollStep = 'form' | 'camera' | 'confirm';

export default function EnrollPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState<EnrollStep>('form');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturedEmbedding, setCapturedEmbedding] = useState<Float32Array | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [message, setMessage] = useState('');
  const setEnrolledUsers = useAuthStore((state) => state.setEnrolledUsers);
  const THRESHOLD = 0.60;

  useEffect(() => {
    if (step !== 'camera') return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const interval = setInterval(detectFaceFrame, 500);
        return () => clearInterval(interval);
      } catch (error) {
        setMessage('Camera access required');
      }
    };

    startCamera();
  }, [step]);

  const detectFaceFrame = async () => {
    if (!videoRef.current) return;
    try {
      const detections = await detectFace(videoRef.current);
      setFaceDetected(detections.length > 0);
    } catch (error) {
      console.error('Face detection error:', error);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;

    try {
      setMessage('Processing face...');
      const embedding = await computeEmbedding(videoRef.current);

      if (!embedding) {
        setMessage('No face detected. Please try again.');
        return;
      }

      setCapturedEmbedding(embedding);
      setStep('confirm');
      setMessage('');
    } catch (error) {
      setMessage('Failed to process face. Please try again.');
    }
  };

  const handleEnroll = async () => {
    if (!userId.trim() || !userName.trim() || !capturedEmbedding) {
      setMessage('Please fill in all fields');
      return;
    }

    setIsEnrolling(true);
    setMessage('Enrolling user...');

    try {
      const existingUsers = await getAllEmbeddings();

      // Check for duplicate enrollment
      for (const stored of existingUsers) {
        const similarity = computeCosineSimilarity(
          capturedEmbedding as unknown as Float32Array,
          new Float32Array(stored.vector)
        );
        if (similarity > THRESHOLD) {
          setMessage('This face is already enrolled under another user');
          setIsEnrolling(false);
          return;
        }
      }

      // Create embedding record
      const embedding: FaceEmbedding = {
        id: uuidv4(),
        userId: userId.trim(),
        userName: userName.trim(),
        vector: Array.from(capturedEmbedding),
        enrolledAt: Date.now(),
      };

      await saveEmbedding(embedding);

      // Update local state
      const updated = await getAllEmbeddings();
      setEnrolledUsers(updated);

      setMessage('User enrolled successfully!');
      setTimeout(() => {
        setStep('form');
        setUserId('');
        setUserName('');
        setCapturedEmbedding(null);
        setMessage('');
      }, 2000);
    } catch (error) {
      setMessage('Enrollment failed. Please try again.');
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Link href="/">
          <a className="text-blue-400 hover:text-blue-300 mb-6 inline-block">â† Back</a>
        </Link>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h1 className="text-3xl font-bold text-white mb-4">User Enrollment</h1>

          {step === 'form' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-2">User ID</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g., user001"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g., John Doe"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {message && (
                <div className="p-3 bg-yellow-900/20 border border-yellow-500 text-yellow-300 rounded">
                  {message}
                </div>
              )}

              <button
                onClick={() => setStep('camera')}
                disabled={!userId.trim() || !userName.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
              >
                Next: Capture Face
              </button>
            </div>
          )}

          {step === 'camera' && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-96 object-cover"
                />
                <div className="absolute top-4 right-4 w-12 h-12 rounded-full border-2 flex items-center justify-center text-white font-bold bg-black/50">
                  <div
                    className={`w-full h-full rounded-full flex items-center justify-center ${
                      faceDetected ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {faceDetected ? 'âœ“' : 'âœ—'}
                  </div>
                </div>
              </div>

              <p className="text-slate-300 text-center">
                {faceDetected ? 'Face detected âœ“' : 'Position your face in the frame'}
              </p>

              <div className="flex gap-4">
                <button
                  onClick={handleCapture}
                  disabled={!faceDetected}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
                >
                  Capture
                </button>

                <button
                  onClick={() => setStep('form')}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {step === 'confirm' && capturedEmbedding && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-900/20 border border-blue-500 rounded text-blue-300">
                <p className="font-bold mb-2">âœ“ Face captured successfully</p>
                <p className="text-sm">Confirm to enroll {userName}</p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
                >
                  {isEnrolling ? 'Enrolling...' : 'Confirm & Enroll'}
                </button>

                <button
                  onClick={() => setStep('camera')}
                  disabled={isEnrolling}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
                >
                  Recapture
                </button>
              </div>

              {message && (
                <div
                  className={`p-3 border rounded ${
                    message.includes('successfully')
                      ? 'bg-green-900/20 border-green-500 text-green-300'
                      : 'bg-red-900/20 border-red-500 text-red-300'
                  }`}
                >
                  {message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

