import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useDispatch, useSelector } from 'react-redux';
import { LivenessChallengeView } from '../components/LivenessChallenge';
import { AuthResultModal } from '../components/AuthResultModal';
import { OfflineBanner } from '../components/OfflineBanner';
import { authenticateUser, getRandomChallenges } from '../services/AuthService';
import { NativeFaceAuth } from '../native/FaceAuthBridge';
import { setProcessing, setLastResult, setCameraActive } from '../store/authSlice';
import type { RootState } from '../store/store';
import type { LivenessResult, LivenessChallenge, FaceLandmarks, AuthResult } from '../types';

const { width, height } = Dimensions.get('window');

type FlowState = 'IDLE' | 'DETECTING_FACE' | 'LIVENESS' | 'MATCHING' | 'RESULT';

interface Props {
  onBack: () => void;
}

export const AuthScreen: React.FC<Props> = ({ onBack }) => {
  const device = useCameraDevice('front');
  const dispatch = useDispatch();
  const { isProcessing } = useSelector((s: RootState) => s.auth);

  const [flowState, setFlowState] = useState<FlowState>('IDLE');
  const [challenges, setChallenges] = useState<LivenessChallenge[]>([]);
  const [livenessResult, setLivenessResult] = useState<LivenessResult | null>(null);
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [landmarks, setLandmarks] = useState<FaceLandmarks | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const frameCount = useRef(0);

  useEffect(() => {
    dispatch(setCameraActive(true));
    return () => {
      dispatch(setCameraActive(false));
    };
  }, [dispatch]);

  const startAuth = useCallback(() => {
    const selected = getRandomChallenges();
    setChallenges(selected);
    setFlowState('DETECTING_FACE');
    setAuthResult(null);
    setLivenessResult(null);
  }, []);

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    frameCount.current += 1;
  }, []);

  const handleFrameCapture = useCallback(async (base64: string) => {
    setLastFrame(base64);
    if (flowState === 'DETECTING_FACE' || flowState === 'LIVENESS') {
      try {
        const [detection, landmarkResult] = await Promise.all([
          NativeFaceAuth.detectFace(base64),
          NativeFaceAuth.computeLandmarks(base64),
        ]);
        setFaceDetected(detection.detected);
        if (landmarkResult.landmarks) setLandmarks(landmarkResult.landmarks);
        if (detection.detected && flowState === 'DETECTING_FACE') {
          setFlowState('LIVENESS');
        }
      } catch (err) {
        console.error('Frame processing error:', err);
      }
    }
  }, [flowState]);

  const handleLivenessComplete = useCallback(
    async (result: LivenessResult) => {
      setLivenessResult(result);
      setFlowState('MATCHING');
      dispatch(setProcessing(true));
      try {
        if (!lastFrame) throw new Error('No frame captured');
        const authRes = await authenticateUser(lastFrame, result);
        setAuthResult(authRes);
        dispatch(setLastResult(authRes));
        setFlowState('RESULT');
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Authentication failed');
        setFlowState('IDLE');
      } finally {
        dispatch(setProcessing(false));
      }
    },
    [lastFrame, dispatch]
  );

  const handleLivenessTimeout = useCallback(() => {
    Alert.alert('Timeout', 'Liveness challenge timed out. Please try again.');
    setFlowState('IDLE');
  }, []);

  const handleResultDismiss = useCallback(() => {
    setFlowState('IDLE');
    setAuthResult(null);
  }, []);

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Front camera not available</Text>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />

      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={flowState !== 'RESULT'}
        frameProcessor={frameProcessor}
        photo={false}
        video={false}
      />

      <View style={styles.overlay}>
        <View style={[styles.ovalGuide, faceDetected && styles.ovalDetected]} />
      </View>

      {flowState === 'IDLE' && (
        <View style={styles.bottomPanel}>
          <Text style={styles.instruction}>Position your face in the oval</Text>
          <TouchableOpacity style={styles.startBtn} onPress={startAuth}>
            <Text style={styles.startBtnText}>Start Authentication</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {flowState === 'DETECTING_FACE' && (
        <View style={styles.bottomPanel}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.instruction}>Detecting face...</Text>
        </View>
      )}

      {flowState === 'LIVENESS' && (
        <View style={styles.bottomPanel}>
          <LivenessChallengeView
            challenges={challenges}
            landmarks={landmarks}
            onComplete={handleLivenessComplete}
            onTimeout={handleLivenessTimeout}
          />
        </View>
      )}

      {flowState === 'MATCHING' && (
        <View style={styles.bottomPanel}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.instruction}>Verifying identity...</Text>
        </View>
      )}

      {flowState === 'RESULT' && authResult && (
        <AuthResultModal result={authResult} onDismiss={handleResultDismiss} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#fff', fontSize: 16, marginBottom: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  ovalGuide: {
    width: width * 0.65,
    height: width * 0.85,
    borderRadius: (width * 0.65) / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    borderStyle: 'dashed',
  },
  ovalDetected: { borderColor: '#4CAF50', borderStyle: 'solid' },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },
  instruction: { color: '#fff', fontSize: 18, textAlign: 'center', fontWeight: '500' },
  startBtn: { backgroundColor: '#007AFF', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 16 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 12 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
