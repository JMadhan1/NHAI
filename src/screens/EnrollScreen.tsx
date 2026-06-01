import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { OfflineBanner } from '../components/OfflineBanner';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { EnrollmentFlow } from '../components/EnrollmentFlow';

interface Props {
  onBack: () => void;
}

export const EnrollScreen: React.FC<Props> = ({ onBack }) => {
  const [showFlow, setShowFlow] = useState(false);

  if (showFlow) {
    return (
      <SafeAreaView style={styles.container}>
        <OfflineBanner />
        <EnrollmentFlow onComplete={onBack} onCancel={() => setShowFlow(false)} />
        <SyncStatusBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />
      <View style={styles.content}>
        <Text style={styles.title}>User Enrollment</Text>
        <Text style={styles.description}>
          Enroll a new user by capturing their facial features. This data will be stored locally and encrypted.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoItem}>📋 Enter user ID and full name</Text>
          <Text style={styles.infoItem}>📸 Capture a clear face photo</Text>
          <Text style={styles.infoItem}>🔒 Face data is encrypted locally</Text>
          <Text style={styles.infoItem}>✅ User is ready to authenticate</Text>
        </View>

        <TouchableOpacity style={styles.startBtn} onPress={() => setShowFlow(true)}>
          <Text style={styles.startBtnText}>Start Enrollment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
      <SyncStatusBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { flex: 1, padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 12 },
  description: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 24, lineHeight: 24 },
  infoBox: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 16, marginBottom: 32 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },
  infoItem: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8, lineHeight: 20 },
  startBtn: { backgroundColor: '#4CAF50', borderRadius: 14, paddingVertical: 16, marginBottom: 12 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 14 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
