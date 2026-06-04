import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { NativeFaceAuth, computeCosineSimilarity } from '../native/FaceAuthBridge';
import { CameraView } from '../components/CameraView';
import { verifyLogin, getUserAccount, UserAccount } from '../services/AccountService';
import { createSession, getCurrentSession } from '../services/SessionService';

interface Props {
  onLoginSuccess: (userId: string) => void;
  onNavigateToEnroll: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess, onNavigateToEnroll }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [step, setStep] = useState<'credentials' | 'face'>('credentials');
  const cameraRef = useRef(null);

  const handleCredentialsSubmit = async () => {
    try {
      setError('');

      if (!username.trim() || !password.trim()) {
        setError('Username and password required');
        return;
      }

      setLoading(true);

      // Verify credentials
      const result = await verifyLogin(username, password);
      if (!result.valid) {
        setError(result.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      // Credentials valid, now proceed to face verification
      setStep('face');
      setShowCamera(true);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceCapture = async (frameBase64: string) => {
    try {
      setError('');
      setLoading(true);

      // Get stored account
      const loginResult = await verifyLogin(username, password);
      if (!loginResult.valid || !loginResult.userId) {
        setError('Credentials verification failed');
        setLoading(false);
        return;
      }

      const account = await getUserAccount(loginResult.userId);
      if (!account) {
        setError('Account not found');
        setLoading(false);
        return;
      }

      // Compute embedding from captured face
      const embResult = await NativeFaceAuth.computeEmbedding(frameBase64);
      if (!embResult.embedding) {
        setError('Failed to process face. Please try again.');
        setLoading(false);
        return;
      }

      // Verify face matches stored embedding
      const similarity = computeCosineSimilarity(embResult.embedding, account.faceEmbedding);
      const FACE_MATCH_THRESHOLD = 0.60;

      if (similarity < FACE_MATCH_THRESHOLD) {
        setError(`Face does not match. Confidence: ${(similarity * 100).toFixed(1)}% (need ${FACE_MATCH_THRESHOLD * 100}%)`);
        setLoading(false);
        return;
      }

      // Face verified! Create session
      const session = await createSession(loginResult.userId, username);

      console.log('[LoginScreen] Login successful:', username);
      Alert.alert('Success', `Welcome back, ${account.fullName}!`);

      // Reset state
      setUsername('');
      setPassword('');
      setShowCamera(false);
      setStep('credentials');

      // Navigate to dashboard
      onLoginSuccess(loginResult.userId);
    } catch (err: any) {
      setError(err.message || 'Face verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (showCamera && step === 'face') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Face Verification</Text>
          <Text style={styles.subtitle}>Point your face at the camera</Text>
        </View>

        <CameraView
          ref={cameraRef}
          onCapture={handleFaceCapture}
          loading={loading}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setShowCamera(false);
            setStep('credentials');
            setError('');
          }}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>VisorAI</Text>
        <Text style={styles.tagline}>SECURE FACE AUTHENTICATION</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Login</Text>

        {/* Username Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={username}
            onChangeText={setUsername}
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            autoCapitalize="none"
          />
        </View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCredentialsSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Continue with Face</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Signup Link */}
        <View style={styles.signupBox}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={onNavigateToEnroll}>
            <Text style={styles.signupLink}>Create one</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>All data is encrypted and stored locally</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050B18', padding: 20 },
  header: { alignItems: 'center', marginVertical: 40, marginBottom: 50 },
  appName: { fontSize: 42, fontWeight: '900', color: '#00D4FF', letterSpacing: 2 },
  tagline: { fontSize: 11, color: '#4A5568', fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    backgroundColor: '#00D4FF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#050B18', fontWeight: '700', fontSize: 14 },
  errorBox: {
    backgroundColor: 'rgba(244,67,54,0.1)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: { color: '#ff7675', fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 20 },
  signupBox: { flexDirection: 'row', justifyContent: 'center' },
  signupText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  signupLink: { color: '#00D4FF', fontSize: 13, fontWeight: '700' },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  footer: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  footerText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
});
