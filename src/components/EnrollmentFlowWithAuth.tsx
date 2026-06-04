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
import { NativeFaceAuth } from '../native/FaceAuthBridge';
import { CameraView } from './CameraView';
import { createAccount, UserAccount } from '../services/AccountService';
import { createSession } from '../services/SessionService';

interface Props {
  onComplete: (userId: string) => void;
  onCancel: () => void;
}

type Step = 'CREDENTIALS' | 'FACE' | 'CONFIRM';

export const EnrollmentFlowWithAuth: React.FC<Props> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<Step>('CREDENTIALS');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');

  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [embedding, setEmbedding] = useState<number[] | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');

  const handleCredentialsNext = useCallback(() => {
    setError('');

    if (!username.trim() || !password.trim() || !email.trim() || !fullName.trim()) {
      setError('Username, password, email, and full name are required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email address');
      return;
    }

    setStep('FACE');
  }, [username, password, confirmPassword, email, fullName]);

  const handleFaceCapture = useCallback(
    async (frameBase64: string) => {
      try {
        setError('');
        setEnrolling(true);

        // Compute embedding
        const embResult = await NativeFaceAuth.computeEmbedding(frameBase64);
        if (!embResult.embedding) {
          setError('Failed to process face. Please try again.');
          setEnrolling(false);
          return;
        }

        setCapturedFrame(frameBase64);
        setEmbedding(embResult.embedding);
        setStep('CONFIRM');
        setEnrolling(false);
      } catch (err: any) {
        setError(err.message || 'Failed to process face');
        setEnrolling(false);
      }
    },
    []
  );

  const handleCreateAccount = useCallback(async () => {
    if (!embedding) {
      setError('No face data. Please capture your face again.');
      return;
    }

    setEnrolling(true);
    try {
      const result = await createAccount(
        username,
        password,
        email,
        fullName,
        embedding,
        phone,
        department,
        designation
      );

      if (!result.success || !result.account) {
        setError(result.error || 'Failed to create account');
        setEnrolling(false);
        return;
      }

      // Create session
      const session = await createSession(result.account.id, username);

      Alert.alert(
        '✅ Account Created Successfully',
        `Welcome, ${fullName}! You are now logged in.`,
        [
          {
            text: 'Continue',
            onPress: () => onComplete(result.account!.id),
          },
        ]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setEnrolling(false);
    }
  }, [username, password, email, fullName, embedding, phone, department, designation, onComplete]);

  // CREDENTIALS FORM STEP
  if (step === 'CREDENTIALS') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Set up your credentials and profile</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a username"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password * (min 6 characters)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter a secure password"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {/* Phone (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Your phone number (optional)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Department (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Department</Text>
            <TextInput
              style={styles.input}
              placeholder="Your department (optional)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={department}
              onChangeText={setDepartment}
            />
          </View>

          {/* Designation (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Designation</Text>
            <TextInput
              style={styles.input}
              placeholder="Your job title (optional)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={designation}
              onChangeText={setDesignation}
            />
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleCredentialsNext}
            disabled={enrolling}
          >
            <Text style={styles.buttonText}>Continue to Face Capture</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelBtn]}
            onPress={onCancel}
            disabled={enrolling}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // FACE CAPTURE STEP
  if (step === 'FACE') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Capture Your Face</Text>
          <Text style={styles.subtitle}>Point your face at the camera</Text>
        </View>

        <CameraView
          onCapture={handleFaceCapture}
          loading={enrolling}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, styles.cancelBtn]}
          onPress={() => setStep('CREDENTIALS')}
          disabled={enrolling}
        >
          <Text style={styles.cancelText}>Back to Credentials</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // CONFIRM STEP
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Confirm & Create Account</Text>
        <Text style={styles.subtitle}>Review your information</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.confirmBox}>
        <Text style={styles.confirmTitle}>Account Details</Text>

        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Username:</Text>
          <Text style={styles.confirmValue}>{username}</Text>
        </View>

        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Email:</Text>
          <Text style={styles.confirmValue}>{email}</Text>
        </View>

        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Full Name:</Text>
          <Text style={styles.confirmValue}>{fullName}</Text>
        </View>

        {phone && (
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Phone:</Text>
            <Text style={styles.confirmValue}>{phone}</Text>
          </View>
        )}

        {department && (
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Department:</Text>
            <Text style={styles.confirmValue}>{department}</Text>
          </View>
        )}

        {designation && (
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Designation:</Text>
            <Text style={styles.confirmValue}>{designation}</Text>
          </View>
        )}

        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Face Enrolled:</Text>
          <Text style={[styles.confirmValue, { color: '#4CAF50' }]}>✓ Yes</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleCreateAccount}
        disabled={enrolling}
      >
        {enrolling ? (
          <ActivityIndicator color="#050B18" size="small" />
        ) : (
          <Text style={styles.buttonText}>Create Account & Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.cancelBtn]}
        onPress={() => setStep('FACE')}
        disabled={enrolling}
      >
        <Text style={styles.cancelText}>Back to Face Capture</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050B18', padding: 16 },
  header: { marginVertical: 20, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },

  form: { marginBottom: 20 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 6 },
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
    marginVertical: 8,
  },
  buttonText: { color: '#050B18', fontWeight: '700', fontSize: 14 },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.1)' },
  cancelText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  errorBox: {
    backgroundColor: 'rgba(244,67,54,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: { color: '#ff7675', fontSize: 12, fontWeight: '600' },

  confirmBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  confirmTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  confirmLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  confirmValue: { fontSize: 13, color: '#fff', fontWeight: '500' },
});
