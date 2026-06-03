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
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import { useDispatch, useSelector } from 'react-redux';
import { LivenessChallengeView } from '../components/LivenessChallenge';
import { AuthResultModal } from '../components/AuthResultModal';
import { OfflineBanner } from '../components/OfflineBanner';
import { authenticateUser, getRandomChallenges } from '../services/AuthService';
import { NativeFaceAuth } from '../native/FaceAuthBridge';
import { setProcessing, setLastResult, setCameraActive } from '../store/authSlice';
import type { RootState } from '../store/store';
import type { LivenessResult, LivenessChallenge, FaceLandmarks, AuthResult } from '../types';

const { width } = Dimensions.get('window');

type FlowState = 'IDLE' | 'DETECTING_FACE' | 'LIVENESS' | 'MATCHING' | 'RESULT';

interface Props {
  onBack: () => void;
}

export const AuthScreen: React.FC<Props> = ({ onBack }) => {
  const device = useCameraDevice('front');
  const dispatch = useDispatch();
  const { isProcessing } = useSelector((s: RootState) => s.auth);
  const cameraRef = useRef<Camera>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [flowState, setFlowState] = useState<FlowState>('IDLE');
  const [challenges, setChallenges] = useState<LivenessChallenge[]>([]);
  const [livenessResult, setLivenessResult] = useState<LivenessResult | null>(null);
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [landmarks, setLandmarks] = useState<FaceLandmarks | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const flowStateRef = useRef<FlowState>('IDLE');
  flowStateRef.current = flowState;

  useEffect(() => {
    dispatch(setCameraActive(true));
    Camera.requestCameraPermission().then(status => {
      setHasPermission(status === 'granted');
    });
    return () => {
      dispatch(setCameraActive(false));
    };
  }, [dispatch]);

  const captureAndProcess = useCallback(async () => {
    const currentFlow = flowStateRef.current;
    if (currentFlow !== 'DETECTING_FACE' && currentFlow !== 'LIVENESS') return;
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      const base64 = await RNFS.readFile(photo.path, 'base64');
      await RNFS.unlink(photo.path).catch(() => {});

      setLastFrame(base64);

      const [detection, landmarkResult] = await Promise.all([
        NativeFaceAuth.detectFace(base64),
        NativeFaceAuth.computeLandmarks(base64),
      ]);

      setFaceDetected(detection.detected);
      if (landmarkResult.landmarks) {
        setLandmarks(landmarkResult.landmarks);
      }

      if (detection.detected && flowStateRef.current === 'DETECTING_FACE') {
        setFlowState('LIVENESS');
      }
    } catch (err) {
      // silently ignore individual frame errors
    }
  }, []);

  useEffect(() => {
    if (flowState === 'DETECTING_FACE' || flowState === 'LIVENESS') {
      frameIntervalRef.current = setInterval(captureAndProcess, 400);
    } else {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    }
    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, [flowState, captureAndProcess]);

  const startAuth = useCallback(() => {
    const selected = getRandomChallenges();
    setChallenges(selected);
    setFlowState('DETECTING_FACE');
    setAuthResult(null);
    setLivenessResult(null);
    setFaceDetected(false);
    setLandmarks(null);
  }, []);

  const handleLivenessComplete = useCallback(
    async (result: LivenessResult) => {
      setLivenessResult(result);
      setFlowState('MATCHING');
      dispatch(setProcessing(true));
      try {
        const frameToUse = lastFrame;
        if (!frameToUse) throw new Error('No frame captured. Please try again.');
        const authRes = await authenticateUser(frameToUse, result);
        setAuthResult(authRes);
        dispatch(setLastResult(authRes));
        setFlowState('RESULT');
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Authentication failed. Please retry.');
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
    setFaceDetected(false);
  }, []);

  if (!device || !hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📷</Text>
          <Text style={styles.errorText}>
            {!hasPermission
              ? 'Camera permission required\nPlease allow access in Settings'
              : 'Front camera not available'}
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />

      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={flowState !== 'RESULT'}
        photo={true}
        video={false}
        audio={false}
      />

      <View style={styles.overlay}>
        <View style={[styles.ovalGuide, faceDetected && styles.ovalDetected]} />
        {faceDetected && flowState === 'DETECTING_FACE' && (
          <Text style={styles.faceFoundLabel}>Face Detected ✓</Text>
        )}
      </View>

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBackBtn} onPress={onBack}>
          <Text style={styles.topBackBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Face Authentication</Text>
        <View style={{ width: 60 }} />
      </View>

      {flowState === 'IDLE' && (
        <View style={styles.bottomPanel}>
          <Text style={styles.instruction}>Center your face in the oval</Text>
          <Text style={styles.subInstruction}>
            You will be asked to complete a liveness check to prevent spoofing
          </Text>
          <TouchableOpacity style={styles.startBtn} onPress={startAuth}>
            <Text style={styles.startBtnText}>🔐  Start Authentication</Text>
          </TouchableOpacity>
        </View>
      )}

      {flowState === 'DETECTING_FACE' && (
        <View style={styles.bottomPanel}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.instruction}>Scanning for face…</Text>
          <Text style={styles.subInstruction}>Look directly at the camera</Text>
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
          <ActivityIndicator color="#007AFF" size="large" />
          <Text style={styles.instruction}>Verifying identity…</Text>
          <Text style={styles.subInstruction}>Searching enrolled database</Text>
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
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  errorIcon: { fontSize: 48 },
  errorText: { color: '#fff', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ovalGuide: {
    width: width * 0.65,
    height: width * 0.82,
    borderRadius: (width * 0.65) / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    borderStyle: 'dashed',
  },
  ovalDetected: { borderColor: '#4CAF50', borderStyle: 'solid' },
  faceFoundLabel: {
    marginTop: 16,
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topBackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  topBackBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.82)',
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  instruction: { color: '#fff', fontSize: 18, textAlign: 'center', fontWeight: '600' },
  subInstruction: { color: 'rgba(255,255,255,0.55)', fontSize: 13, textAlign: 'center' },
  startBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 40,
    paddingVertical: 16,
    marginTop: 4,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
