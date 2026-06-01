import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { OfflineBanner } from '../components/OfflineBanner';
import { SyncStatusBar } from '../components/SyncStatusBar';

interface Props {
  onNavigate: (screen: string) => void;
}

export const HomeScreen: React.FC<Props> = ({ onNavigate }) => {
  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>FaceAuth Offline</Text>
        <Text style={styles.subtitle}>Facial Recognition & Liveness Detection</Text>

        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => onNavigate('Auth')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardIcon}>🔐</Text>
            <Text style={styles.cardTitle}>Authenticate</Text>
            <Text style={styles.cardDesc}>Login with your face</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => onNavigate('Enroll')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardIcon}>👤</Text>
            <Text style={styles.cardTitle}>Enroll User</Text>
            <Text style={styles.cardDesc}>Register a new face</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => onNavigate('History')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardIcon}>📋</Text>
            <Text style={styles.cardTitle}>Auth History</Text>
            <Text style={styles.cardDesc}>View past attempts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => onNavigate('Admin')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardIcon}>⚙️</Text>
            <Text style={styles.cardTitle}>Admin Panel</Text>
            <Text style={styles.cardDesc}>Manage users & settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>System Status</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Offline-First:</Text>
            <Text style={styles.statValue}>✅ Enabled</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Encryption:</Text>
            <Text style={styles.statValue}>✅ AES-256</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Database:</Text>
            <Text style={styles.statValue}>✅ SQLCipher</Text>
          </View>
        </View>
      </ScrollView>
      <SyncStatusBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 24, paddingBottom: 32 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 32, textAlign: 'center' },
  menuSection: { marginBottom: 32 },
  menuCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardIcon: { fontSize: 32, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  statsSection: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 16 },
  statsTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  statValue: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
});
