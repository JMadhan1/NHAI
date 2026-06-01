import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import { getAuthHistory, getAuthAttemptCount, getSuccessfulAuthCount } from '../services/StorageService';
import { OfflineBanner } from '../components/OfflineBanner';
import { SyncStatusBar } from '../components/SyncStatusBar';
import type { AuthAttempt } from '../types';

interface Props {
  onBack: () => void;
}

export const HistoryScreen: React.FC<Props> = ({ onBack }) => {
  const [attempts, setAttempts] = useState<AuthAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const [history, total, successes] = await Promise.all([
        getAuthHistory(100),
        getAuthAttemptCount(),
        getSuccessfulAuthCount(),
      ]);
      setAttempts(history);
      setTotalCount(total);
      setSuccessCount(successes);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const getResultColor = (result: AuthAttempt['result']) => {
    switch (result) {
      case 'SUCCESS':
        return '#4CAF50';
      case 'FAIL_LIVENESS':
        return '#FF9800';
      case 'FAIL_NO_MATCH':
        return '#f44336';
      case 'FAIL_NO_FACE':
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getResultLabel = (result: AuthAttempt['result']) => {
    switch (result) {
      case 'SUCCESS':
        return '✅ Success';
      case 'FAIL_LIVENESS':
        return '⚠️ Liveness Failed';
      case 'FAIL_NO_MATCH':
        return '❌ No Match';
      case 'FAIL_NO_FACE':
        return '❌ No Face';
      default:
        return '❓ Unknown';
    }
  };

  const successRate =
    totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Auth History</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total Attempts</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{successCount}</Text>
          <Text style={styles.statLabel}>Successful</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#007AFF' }]}>{successRate}%</Text>
          <Text style={styles.statLabel}>Success Rate</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : attempts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No authentication attempts yet</Text>
        </View>
      ) : (
        <FlatList
          data={attempts}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.attemptCard}>
              <View style={styles.attemptHeader}>
                <Text style={[styles.resultBadge, { color: getResultColor(item.result) }]}>
                  {getResultLabel(item.result)}
                </Text>
                <Text style={styles.timestamp}>
                  {format(new Date(item.timestamp), 'MMM dd, HH:mm:ss')}
                </Text>
              </View>

              {item.userId && (
                <Text style={styles.userId}>User: {item.userId}</Text>
              )}

              <View style={styles.metricsRow}>
                <Text style={styles.metric}>Confidence: {(item.confidence * 100).toFixed(1)}%</Text>
                <Text style={styles.metric}>Liveness: {(item.livenessScore * 100).toFixed(0)}%</Text>
              </View>

              {item.synced && <Text style={styles.synced}>✓ Synced to server</Text>}
            </View>
          )}
        />
      )}

      <SyncStatusBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  backBtn: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  stat: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 12, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
  listContent: { paddingHorizontal: 24, paddingVertical: 8 },
  attemptCard: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#007AFF' },
  attemptHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resultBadge: { fontSize: 14, fontWeight: '700' },
  timestamp: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  userId: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  metric: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  synced: { fontSize: 11, color: '#4CAF50', fontWeight: '600' },
});
