import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import type { AuthResult } from '../types';

const { width } = Dimensions.get('window');

interface Props {
  result: AuthResult;
  onDismiss: () => void;
  onSuccess?: () => void;
}

export const AuthResultModal: React.FC<Props> = ({ result, onDismiss, onSuccess }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    Vibration.vibrate(result.success ? [0, 100] : [0, 100, 100, 100]);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto dismiss success after 2 seconds
    if (result.success) {
      const timer = setTimeout(() => {
        if (onSuccess) {
          setIsLoading(true);
          onSuccess();
        } else {
          onDismiss();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [scaleAnim, opacityAnim, result.success, onDismiss, onSuccess]);

  return (
    <View style={styles.backdrop}>
      <Animated.View
        style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
      >
        <Text style={styles.icon}>{result.success ? '✅' : '❌'}</Text>
        <Text style={[styles.title, { color: result.success ? '#4CAF50' : '#f44336' }]}>
          {result.success ? 'Authenticated' : 'Not Recognised'}
        </Text>
        {result.success && result.userName && (
          <Text style={styles.userName}>{result.userName}</Text>
        )}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{(result.confidence * 100).toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Confidence</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{(result.liveness.score * 100).toFixed(0)}%</Text>
            <Text style={styles.statLabel}>Liveness</Text>
          </View>
        </View>
        {result.errorCode && (
          <Text style={styles.errorMsg}>
            {result.errorCode === 'LIVENESS_FAIL'
              ? 'Liveness check failed — spoofing attempt blocked'
              : result.errorCode === 'NO_FACE'
              ? 'No face detected in frame'
              : result.errorCode === 'NO_MATCH'
              ? 'Face not found in enrolled users'
              : 'Model error — please retry'}
          </Text>
        )}

        {result.success ? (
          <View style={styles.successContainer}>
            {isLoading ? (
              <>
                <ActivityIndicator size="large" color="#00E676" />
                <Text style={styles.loadingText}>Loading dashboard…</Text>
              </>
            ) : (
              <>
                <Text style={styles.successText}>Authentication Successful!</Text>
                <Text style={styles.successSubtext}>Redirecting to home screen…</Text>
              </>
            )}
          </View>
        ) : (
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={onDismiss}>
              <Text style={styles.btnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.secondaryBtn]}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, styles.secondaryBtnText]}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 32,
    width: width * 0.85,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  icon: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  userName: { fontSize: 20, color: '#fff', fontWeight: '600', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 24, marginVertical: 16 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  errorMsg: { fontSize: 14, color: '#ff8a80', textAlign: 'center', marginBottom: 16 },

  buttonGroup: { flexDirection: 'column', gap: 12, width: '100%', marginTop: 12 },
  btn: { borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14, marginTop: 8 },
  primaryBtn: { backgroundColor: '#007AFF' },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  secondaryBtnText: { color: 'rgba(255,255,255,0.8)' },

  successContainer: { alignItems: 'center', marginTop: 12, gap: 8 },
  successText: { fontSize: 18, fontWeight: '700', color: '#4CAF50' },
  successSubtext: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
});
