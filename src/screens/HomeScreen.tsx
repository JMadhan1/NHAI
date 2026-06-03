import React, { useState, useEffect } from 'react';
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
  const [enrolledCount, setEnrolledCount] = useState(247);
  const [pendingSyncCount, setPendingSyncCount] = useState(4);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TollGuard <Text style={styles.headerSubtitle}>AI</Text></Text>
          <View style={styles.headerRight}>
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineText}>● OFFLINE</Text>
            </View>
            <TouchableOpacity style={styles.settingsBtn} onPress={() => onNavigate('Settings')}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting Section */}
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

        {/* Menu Grid - 2x2 */}
        <View style={styles.menuGrid}>
          <TouchableOpacity
            style={styles.menuCard}
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
            <Text style={styles.cardIcon}>⚙️</Text>
            <Text style={styles.cardTitle}>Admin</Text>
            <Text style={styles.cardDesc}>Users & sync control</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ENROLLED</Text>
            <Text style={styles.statValue}>{enrolledCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>PENDING</Text>
            <Text style={[styles.statValue, { color: '#ff9500' }]}>{pendingSyncCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ACCURACY</Text>
            <Text style={[styles.statValue, { color: '#10b981' }]}>99.1%</Text>
          </View>
        </View>

        {/* Sync Status */}
        {pendingSyncCount > 0 && (
          <TouchableOpacity style={styles.syncBanner}>
            <Text style={styles.syncText}>● {pendingSyncCount} records waiting to sync</Text>
            <Text style={styles.syncArrow}>→</Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    color: '#a0aec0',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ff9500',
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff9500',
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: { fontSize: 16 },

  greetingCard: {
    backgroundColor: 'rgba(21, 26, 58, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  greetingLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#718096',
    letterSpacing: 1,
    marginBottom: 4,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  greetingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'monospace',
  },
  dateText: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 4,
  },
  greetingIcon: {
    fontSize: 40,
  },

  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  menuCard: {
    width: '48%',
    backgroundColor: 'rgba(21, 26, 58, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 11,
    color: '#718096',
  },

  statsBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(21, 26, 58, 0.8)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },

  syncBanner: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff9500',
  },
  syncArrow: {
    fontSize: 14,
    color: '#ff9500',
  },
});
