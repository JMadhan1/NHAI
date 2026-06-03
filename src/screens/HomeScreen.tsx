import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { OfflineBanner } from '../components/OfflineBanner';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { getUserCount, getPendingCount, getSuccessfulAuthCount, getAuthAttemptCount } from '../services/StorageService';
import type { RootState } from '../store/store';

interface Props {
  onNavigate: (screen: string) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

export const HomeScreen: React.FC<Props> = ({ onNavigate }) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [greeting, setGreeting] = useState(getGreeting());
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [successRate, setSuccessRate] = useState('–');
  const isOnline = useSelector((s: RootState) => s.sync.isOnline);

  const loadStats = useCallback(async () => {
    try {
      const [users, pending, total, success] = await Promise.all([
        getUserCount(),
        getPendingCount(),
        getAuthAttemptCount(),
        getSuccessfulAuthCount(),
      ]);
      setEnrolledCount(users);
      setPendingSyncCount(pending);
      if (total > 0) {
        setSuccessRate(`${Math.round((success / total) * 100)}%`);
      } else {
        setSuccessRate('–');
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      });
      const date = now.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      setCurrentTime(time);
      setCurrentDate(date);
      setGreeting(getGreeting());
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            TollGuard <Text style={styles.headerAI}>AI</Text>
          </Text>
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, isOnline ? styles.onlineBadge : styles.offlineBadge]}>
              <Text style={[styles.statusText, { color: isOnline ? '#4CAF50' : '#ff9500' }]}>
                ● {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
            <TouchableOpacity style={styles.settingsBtn} onPress={() => onNavigate('Settings')}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.greetingCard}>
          <Text style={styles.greetingLabel}>{greeting}</Text>
          <Text style={styles.greetingTitle}>Toll Plaza Team</Text>
          <View style={styles.greetingContent}>
            <View>
              <Text style={styles.timeText}>{currentTime}</Text>
              <Text style={styles.dateText}>{currentDate}</Text>
            </View>
            <Text style={styles.greetingIcon}>🔐</Text>
          </View>
        </View>

        <View style={styles.menuGrid}>
          <TouchableOpacity
            style={[styles.menuCard, styles.menuCardPrimary]}
            onPress={() => onNavigate('Auth')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardIcon}>🔐</Text>
            <Text style={styles.cardTitle}>Authenticate</Text>
            <Text style={styles.cardDesc}>Verify a person's face</Text>
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
            <Text style={styles.cardTitle}>Auth Log</Text>
            <Text style={styles.cardDesc}>Recent verifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => onNavigate('Admin')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardIcon}>🛡️</Text>
            <Text style={styles.cardTitle}>Admin</Text>
            <Text style={styles.cardDesc}>Users & sync control</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsBar}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ENROLLED</Text>
            <Text style={styles.statValue}>{enrolledCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>PENDING SYNC</Text>
            <Text style={[styles.statValue, pendingSyncCount > 0 && { color: '#ff9500' }]}>
              {pendingSyncCount}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>SUCCESS RATE</Text>
            <Text style={[styles.statValue, { color: '#10b981' }]}>{successRate}</Text>
          </View>
        </View>

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>System Capabilities</Text>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>✅</Text>
            <Text style={styles.featureText}>BlazeFace detection — 100% offline</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>✅</Text>
            <Text style={styles.featureText}>MobileFaceNet 128D embeddings</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>✅</Text>
            <Text style={styles.featureText}>Liveness: blink, smile, head turns, nod</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>✅</Text>
            <Text style={styles.featureText}>AES-256 encrypted local database</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>✅</Text>
            <Text style={styles.featureText}>Auto AWS sync when online</Text>
          </View>
        </View>

        {pendingSyncCount > 0 && (
          <TouchableOpacity style={styles.syncBanner} onPress={() => onNavigate('Admin')}>
            <Text style={styles.syncText}>● {pendingSyncCount} record{pendingSyncCount !== 1 ? 's' : ''} waiting to sync</Text>
            <Text style={styles.syncArrow}>Sync →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <SyncStatusBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  content: { padding: 16, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerAI: { color: '#007AFF' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  onlineBadge: { borderColor: '#4CAF50' },
  offlineBadge: { borderColor: '#ff9500' },
  statusText: { fontSize: 11, fontWeight: '600' },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: { fontSize: 16 },

  greetingCard: {
    backgroundColor: 'rgba(21, 26, 58, 0.9)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  greetingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#718096',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  greetingTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 12 },
  greetingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'monospace',
  },
  dateText: { fontSize: 12, color: '#a0aec0', marginTop: 4 },
  greetingIcon: { fontSize: 42 },

  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  menuCard: {
    width: '48%',
    backgroundColor: 'rgba(21, 26, 58, 0.9)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
  },
  menuCardPrimary: {
    borderColor: 'rgba(0, 122, 255, 0.4)',
  },
  cardIcon: { fontSize: 32, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardDesc: { fontSize: 11, color: '#718096' },

  statsBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(21, 26, 58, 0.9)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#718096',
    marginBottom: 6,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#fff' },

  featuresCard: {
    backgroundColor: 'rgba(21, 26, 58, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  featuresTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#718096',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  featureDot: { fontSize: 12 },
  featureText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  syncBanner: {
    backgroundColor: 'rgba(255,149,0,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncText: { fontSize: 13, fontWeight: '600', color: '#ff9500' },
  syncArrow: { fontSize: 13, color: '#ff9500', fontWeight: '700' },
});
