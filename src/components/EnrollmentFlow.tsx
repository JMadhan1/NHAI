import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import { enrollUser } from '../services/AuthService';

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

type Step = 'FORM' | 'CAMERA' | 'CONFIRM';

const { width } = Dimensions.get('window');

export const EnrollmentFlow: React.FC<Props> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<Step>('FORM');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('front');

  useEffect(() => {
    if (step === 'CAMERA') {
      Camera.requestCameraPermission().then(status => {
        setHasPermission(status === 'granted');
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'Please grant camera access in your device settings to enroll a face.',
            [{ text: 'OK', onPress: () => setStep('FORM') }]
          );
        }
      });
    }
  }, [step]);

  const handleNextToCamera = useCallback(() => {
    if (!userId.trim()) {
      Alert.alert('Missing Info', 'Please enter a User ID');
      return;
    }
    if (!userName.trim()) {
      Alert.alert('Missing Info', 'Please enter the full name');
      return;
    }
    setStep('CAMERA');
  }, [userId, userName]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) {
      Alert.alert('Camera Error', 'Camera not ready. Please try again.');
      return;
    }
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      const base64 = await RNFS.readFile(photo.path, 'base64');
      await RNFS.unlink(photo.path).catch(() => {});
      setCapturedFrame(base64);
      setStep('CONFIRM');
    } catch (err: any) {
      Alert.alert('Capture Failed', err.message || 'Could not capture photo. Please try again.');
    } finally {
      setCapturing(false);
    }
  }, []);

  const handleEnroll = useCallback(async () => {
    if (!userId.trim() || !userName.trim()) {
      Alert.alert('Missing Info', 'Please enter both User ID and Name');
      return;
    }
    if (!capturedFrame) {
      Alert.alert('No Photo', 'Please capture a face photo first');
      return;
    }
    setEnrolling(true);
    try {
      const result = await enrollUser(userId.trim(), userName.trim(), capturedFrame);
      if (result.success) {
        Alert.alert('✅ Enrolled Successfully', `${userName} has been enrolled and is ready to authenticate.`, [
          {
            text: 'OK',
            onPress: () => {
              setStep('FORM');
              setUserId('');
              setUserName('');
              setCapturedFrame(null);
              onComplete();
            },
          },
        ]);
      } else {
        Alert.alert('Enrollment Failed', result.error || 'Could not enroll user. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Unexpected error during enrollment');
    } finally {
      setEnrolling(false);
    }
  }, [userId, userName, capturedFrame, onComplete]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Enroll New User</Text>

      {step === 'FORM' && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Employee ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., EMP-001"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Rajesh Kumar"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={userName}
              onChangeText={setUserName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>📸 Photo Tips</Text>
            <Text style={styles.tipsItem}>• Face the camera directly in good lighting</Text>
            <Text style={styles.tipsItem}>• Remove glasses or hat if possible</Text>
            <Text style={styles.tipsItem}>• Keep a neutral expression</Text>
            <Text style={styles.tipsItem}>• Ensure your full face is visible</Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleNextToCamera}>
            <Text style={styles.primaryBtnText}>Next: Capture Face →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'CAMERA' && (
        <>
          <Text style={styles.instruction}>Position your face in the oval and tap Capture</Text>

          {hasPermission && device ? (
            <View style={styles.cameraContainer}>
              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFillObject}
                device={device}
                isActive={step === 'CAMERA'}
                photo={true}
                video={false}
                audio={false}
              />
              <View style={styles.ovalOverlay}>
                <View style={styles.ovalGuide} />
              </View>
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              <View style={styles.noCameraBox}>
                <Text style={styles.noCameraText}>
                  {!hasPermission ? '📷 Camera permission required' : '📷 Camera not available'}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.captureBtn, capturing && styles.captureBtnDisabled]}
            onPress={handleCapture}
            disabled={capturing || !hasPermission || !device}
          >
            {capturing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.captureBtnText}>📸  Capture</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('FORM')}>
            <Text style={styles.secondaryBtnText}>← Back</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'CONFIRM' && (
        <>
          <Text style={styles.instruction}>Review and confirm enrollment</Text>

          <View style={styles.confirmBox}>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Employee ID</Text>
              <Text style={styles.confirmValue}>{userId}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Full Name</Text>
              <Text style={styles.confirmValue}>{userName}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Photo</Text>
              <Text style={[styles.confirmValue, { color: '#4CAF50' }]}>✓ Captured</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Encryption</Text>
              <Text style={[styles.confirmValue, { color: '#4CAF50' }]}>AES-256 Local</Text>
            </View>
          </View>

          <View style={styles.securityNote}>
            <Text style={styles.securityNoteText}>
              🔒  Face embedding will be encrypted and stored locally only. No data leaves this device without consent.
            </Text>
          </View>

          {enrolling ? (
            <View style={styles.enrollingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.enrollingText}>Processing face embedding…</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.enrollBtn} onPress={handleEnroll}>
                <Text style={styles.enrollBtnText}>✅  Confirm & Enroll</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('CAMERA')}>
                <Text style={styles.secondaryBtnText}>🔄  Recapture Photo</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 24, textAlign: 'center' },
  instruction: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 16, textAlign: 'center' },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#718096', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  tipsBox: {
    backgroundColor: 'rgba(0,122,255,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.2)',
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 8 },
  tipsItem: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },

  cameraContainer: {
    height: 380,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
    position: 'relative',
  },
  ovalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ovalGuide: {
    width: width * 0.55,
    height: width * 0.7,
    borderRadius: (width * 0.55) / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    borderStyle: 'dashed',
  },
  noCameraBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a1e',
  },
  noCameraText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, textAlign: 'center' },

  confirmBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  confirmLabel: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  confirmValue: { fontSize: 14, fontWeight: '700', color: '#fff' },

  securityNote: {
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
  },
  securityNoteText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },

  enrollingContainer: { alignItems: 'center', paddingVertical: 24, gap: 16 },
  enrollingText: { fontSize: 15, color: 'rgba(255,255,255,0.6)' },

  primaryBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  captureBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  captureBtnDisabled: { opacity: 0.6 },
  captureBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  enrollBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  enrollBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: {
    backgroundColor: 'rgba(244,67,54,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.25)',
  },
  cancelBtnText: { color: '#f44336', fontSize: 15, fontWeight: '700' },
});
