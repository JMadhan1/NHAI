import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  getAllEmbeddings,
  deleteEmbedding,
  purgeLocalSyncedAttempts,
  getUserCount,
  getPendingCount,
  clearAuthHistory,
} from '../services/StorageService';
import { manualSync } from '../services/SyncService';
import { setSyncing, setSyncComplete, setPendingCount } from '../store/syncSlice';
import { OfflineBanner } from '../components/OfflineBanner';
import type { FaceEmbedding } from '../types';
import type { RootState } from '../store/store';

interface Props {
  onBack: () => void;
}

export const AdminScreen: React.FC<Props> = ({ onBack }) => {
  const [embeddings, setEmbeddings] = useState<FaceEmbedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCountState] = useState(0);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const { isOnline, isSyncing } = useSelector((s: RootState) => s.sync);
  const dispatch = useDispatch();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, pending] = await Promise.all([
        getAllEmbeddings(),
        getPendingCount(),
      ]);
      setEmbeddings(data);
      setPendingCountState(pending);
      dispatch(setPendingCount(pending));
    } catch (err) {
      Alert.alert('Error', 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteUser = useCallback((userId: string, userName: string) => {
    Alert.alert('Delete User', `Remove ${userName} from the enrolled database?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEmbedding(userId);
            setEmbeddings(prev => prev.filter(e => e.userId !== userId));
          } catch (err) {
            Alert.alert('Error', 'Failed to delete user');
          }
        },
      },
    ]);
  }, []);

  const handleManualSync = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('No Connection', 'Device is offline. Connect to network and try again.');
      return;
    }
    dispatch(setSyncing(true));
    setSyncResult(null);
    try {
      const result = await manualSync();
      dispatch(setSyncComplete({ at: Date.now(), error: result.errors[0] }));
      if (result.errors.length > 0) {
        setSyncResult(`⚠️ Sync error: ${result.errors[0]}`);
      } else {
        setSyncResult(`✅ Uploaded ${result.uploaded} record(s), purged ${result.purged}`);
      }
      await loadData();
    } catch (err: any) {
      dispatch(setSyncComplete({ at: Date.now(), error: err.message }));
      setSyncResult(`❌ ${err.message}`);
    }
  }, [isOnline, dispatch, loadData]);

  const handlePurgeSynced = useCallback(() => {
    Alert.alert(
      'Purge Synced Records',
      'This will permanently delete all locally stored auth attempts that have already been synced to AWS. Unsynced records will NOT be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge',
          style: 'destructive',
          onPress: async () => {
            try {
              const purged = await purgeLocalSyncedAttempts();
              Alert.alert('Purged', `${purged} synced record(s) deleted from local storage.`);
              await loadData();
            } catch (err) {
              Alert.alert('Error', 'Failed to purge synced data');
            }
          },
        },
      ]
    );
  }, [loadData]);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      'Clear Auth History',
      'This will permanently delete ALL authentication attempt logs (synced and unsynced). This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAuthHistory();
              setPendingCountState(0);
              dispatch(setPendingCount(0));
              setSyncResult('✅ Auth history cleared');
            } catch (err) {
              Alert.alert('Error', 'Failed to clear history');
            }
          },
        },
      ]
    );
  }, [dispatch]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
        <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#4CAF50' : '#ff9500' }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{embeddings.length}</Text>
            <Text style={styles.statLabel}>Enrolled</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, pendingCount > 0 && { color: '#ff9500' }]}>
              {pendingCount}
            </Text>
            <Text style={styles.statLabel}>Pending Sync</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: isOnline ? '#4CAF50' : '#ff9500' }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text style={styles.statLabel}>Network</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYNC & DATA</Text>

          <TouchableOpacity
            style={[styles.actionBtn, styles.syncBtn, (!isOnline || isSyncing) && styles.actionBtnDisabled]}
            onPress={handleManualSync}
            disabled={!isOnline || isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.actionBtnIcon}>☁️</Text>
            )}
            <View style={styles.actionBtnTextGroup}>
              <Text style={styles.actionBtnTitle}>
                {isSyncing ? 'Syncing…' : 'Sync to AWS Now'}
              </Text>
              <Text style={styles.actionBtnDesc}>
                {isOnline ? `${pendingCount} record(s) pending upload` : 'No network connection'}
              </Text>
            </View>
          </TouchableOpacity>

          {syncResult && (
            <View style={styles.syncResultBox}>
              <Text style={styles.syncResultText}>{syncResult}</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.actionBtn, styles.purgeBtn]} onPress={handlePurgeSynced}>
            <Text style={styles.actionBtnIcon}>🗑️</Text>
            <View style={styles.actionBtnTextGroup}>
              <Text style={styles.actionBtnTitle}>Purge Synced Records</Text>
              <Text style={styles.actionBtnDesc}>Remove locally cached records that are already on AWS</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={handleClearHistory}>
            <Text style={styles.actionBtnIcon}>⚠️</Text>
            <View style={styles.actionBtnTextGroup}>
              <Text style={styles.actionBtnTitle}>Clear Auth History</Text>
              <Text style={styles.actionBtnDesc}>Delete all authentication attempt logs</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ENROLLED USERS ({embeddings.length})</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 24 }} />
          ) : embeddings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>👤  No enrolled users yet</Text>
              <Text style={styles.emptySubText}>Enroll users from the home screen</Text>
            </View>
          ) : (
            embeddings.map((item) => (
              <View key={item.id} style={styles.userCard}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {item.userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.userName}</Text>
                  <Text style={styles.userId}>ID: {item.userId}</Text>
                  <Text style={styles.enrollDate}>Enrolled {formatDate(item.enrolledAt)}</Text>
                  <Text style={styles.vectorInfo}>{item.vector.length}D embedding · AES-256</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteUser(item.userId, item.userName)}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.footerInfo}>
          <Text style={styles.footerInfoText}>
            🔒  All facial data is encrypted with AES-256 via SQLCipher and hardware-backed keystore. No data leaves the device without explicit sync.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(21,26,58,0.8)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#718096', fontWeight: '600' },

  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
  },
  syncBtn: {
    backgroundColor: 'rgba(0,122,255,0.12)',
    borderColor: 'rgba(0,122,255,0.3)',
  },
  purgeBtn: {
    backgroundColor: 'rgba(255,149,0,0.1)',
    borderColor: 'rgba(255,149,0,0.25)',
  },
  dangerBtn: {
    backgroundColor: 'rgba(244,67,54,0.08)',
    borderColor: 'rgba(244,67,54,0.2)',
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnIcon: { fontSize: 22 },
  actionBtnTextGroup: { flex: 1 },
  actionBtnTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  actionBtnDesc: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },

  syncResultBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  syncResultText: { fontSize: 13, color: '#fff', textAlign: 'center' },

  emptyContainer: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '600' },
  emptySubText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },

  userCard: {
    backgroundColor: 'rgba(21,26,58,0.8)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  userId: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 },
  enrollDate: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 },
  vectorInfo: { fontSize: 10, color: 'rgba(255,255,255,0.25)' },
  deleteBtn: {
    backgroundColor: 'rgba(244,67,54,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.3)',
  },
  deleteBtnText: { color: '#f44336', fontSize: 12, fontWeight: '700' },

  footerInfo: {
    margin: 16,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    marginBottom: 32,
  },
  footerInfoText: { fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 18 },
});
