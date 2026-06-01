import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { enrollUser } from '../services/AuthService';

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

type Step = 'FORM' | 'CAMERA' | 'CONFIRM';

export const EnrollmentFlow: React.FC<Props> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<Step>('FORM');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const handleCapture = useCallback(() => {
    setCapturedFrame('captured');
    setStep('CONFIRM');
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
      setEnrolling(false);
      if (result.success) {
        Alert.alert('Success', `${userName} has been enrolled`, [
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
        Alert.alert('Failed', result.error || 'Enrollment failed');
      }
    } catch (err: any) {
      setEnrolling(false);
      Alert.alert('Error', err.message);
    }
  }, [userId, userName, capturedFrame, onComplete]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Enroll New User</Text>

      {step === 'FORM' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="User ID (e.g., user123)"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={userId}
            onChangeText={setUserId}
          />
          <TextInput
            style={styles.input}
            placeholder="Full Name (e.g., John Doe)"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={userName}
            onChangeText={setUserName}
          />
          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('CAMERA')}>
            <Text style={styles.nextBtnText}>Next: Capture Face</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'CAMERA' && (
        <>
          <Text style={styles.instruction}>Position your face in front of the camera</Text>
          <View style={styles.cameraPlaceholder} />
          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
            <Text style={styles.captureBtnText}>Capture</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('FORM')}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'CONFIRM' && (
        <>
          <Text style={styles.instruction}>Confirm Enrollment</Text>
          <View style={styles.confirmedFrame} />
          <Text style={styles.summaryText}>User ID: {userId}</Text>
          <Text style={styles.summaryText}>Name: {userName}</Text>
          {enrolling ? (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          ) : (
            <>
              <TouchableOpacity style={styles.enrollBtn} onPress={handleEnroll}>
                <Text style={styles.enrollBtnText}>Confirm & Enroll</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.recaptureBtn} onPress={() => setStep('CAMERA')}>
                <Text style={styles.recaptureBtnText}>Recapture</Text>
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
  content: { padding: 24, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 24, textAlign: 'center' },
  instruction: { fontSize: 16, color: '#fff', marginBottom: 16, textAlign: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cameraPlaceholder: { height: 400, backgroundColor: '#000', borderRadius: 12, marginBottom: 16 },
  confirmedFrame: { height: 300, backgroundColor: '#0a0a1e', borderRadius: 12, marginBottom: 16 },
  summaryText: { fontSize: 16, color: '#fff', marginBottom: 8 },
  loader: { marginVertical: 24 },
  nextBtn: { backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  captureBtn: { backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  captureBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  enrollBtn: { backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  enrollBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  recaptureBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  recaptureBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  cancelBtn: { backgroundColor: '#f44336', borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  cancelBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
