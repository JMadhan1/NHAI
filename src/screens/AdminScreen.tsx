import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  getAllEmbeddings, deleteEmbedding, purgeLocalSyncedAttempts,
  getUserCount, getPendingCount, clearAuthHistory,
} from '../services/StorageService';
import { manualSync } from '../services/SyncService';
import { setSyncing, setSyncComplete, setPendingCount } from '../store/syncSlice';
import { OfflineBanner } from '../components/OfflineBanner';
import type { FaceEmbedding } from '../types';
import type { RootState } from '../store/store';

interface Props {
  onBack: () => void;
  onNavigate?: (screen: string) => void;
}

export const AdminScreen: React.FC<Props> = ({ onBack, onNavigate }) => {
  const [embeddings, setEmbeddings] = useState<FaceEmbedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCountState] = useState(0);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const { isOnline, isSyncing } = useSelector((s: RootState) => s.sync);
  const dispatch = useDispatch();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, pending] = await Promise.all([getAllEmbeddings(), getPendingCount()]);
      setEmbeddings(data);
      setPendingCountState(pending);
      dispatch(setPendingCount(pending));
    } catch {
      Alert.alert('Error', 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteUser = useCallback((userId: string, userName: string) => {
    Alert.alert('Delete User', `Remove ${userName} from the enrolled database?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteEmbedding(userId);
          setEmbeddings(prev => prev.filter(e => e.userId !== userId));
        },
      },
    ]);
  }, []);

  const handleManualSync = useCallback(async () => {
    if (!isOnline) { Alert.alert('No Connection', 'Device is offline. Connect and try again.'); return; }
    dispatch(setSyncing(true));
    setSyncResult(null);
    try {
      const result = await manualSync();
      dispatch(setSyncComplete({ at: Date.now(), error: result.errors[0] }));
      setSyncResult(result.errors.length > 0 ? `⚠️ ${result.errors[0]}` : `✅ Uploaded ${result.uploaded} record(s)`);
      await loadData();
    } catch (err: any) {
      dispatch(setSyncComplete({ at: Date.now(), error: err.message }));
      setSyncResult(`❌ ${err.message}`);
    }
  }, [isOnline, dispatch, loadData]);

  const handlePurgeSynced = useCallback(() => {
    Alert.alert('Purge Synced Records', 'Delete all locally stored records that have been synced to AWS?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Purge', style: 'destructive',
        onPress: async () => {
          const purged = await purgeLocalSyncedAttempts();
          Alert.alert('Purged', `${purged} synced record(s) removed from local storage.`);
          await loadData();
        },
      },
    ]);
  }, [loadData]);

  const handleClearHistory = useCallback(() => {
    Alert.alert('Clear Auth History', 'Permanently delete ALL authentication attempt logs?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive',
        onPress: async () => {
          await clearAuthHistory();
          setPendingCountState(0);
          dispatch(setPendingCount(0));
          setSyncResult('✅ Auth history cleared');
        },
      },
    ]);
  }, [dispatch]);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <SafeAreaView style={s.root}>
      <OfflineBanner />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>Admin Panel</Text>
        <View style={[s.dot, { backgroundColor: isOnline ? '#00E676' : '#FFB300' }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={s.statsRow}>
          {[
            { label: 'Enrolled', value: `${embeddings.length}`, color: '#00D4FF' },
            { label: 'Pending Sync', value: `${pendingCount}`, color: pendingCount > 0 ? '#FFB300' : '#fff' },
            { label: 'Network', value: isOnline ? 'Online' : 'Offline', color: isOnline ? '#00E676' : '#FFB300' },
          ].map(item => (
            <View key={item.label} style={s.statCard}>
              <Text style={[s.statVal, { color: item.color }]}>{item.value}</Text>
              <Text style={s.statLbl}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>EMPLOYEE MANAGEMENT</Text>
          <TouchableOpacity style={[s.actionBtn, s.empBtn]} onPress={() => onNavigate?.('EmployeeManagement')}>
            <Text style={s.actionIcon}>👥</Text>
            <View style={s.actionText}>
              <Text style={s.actionTitle}>All Employees</Text>
              <Text style={s.actionDesc}>View staff list, shifts, attendance schedule</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.dashBtn]} onPress={() => onNavigate?.('EmployeeDashboard')}>
            <Text style={s.actionIcon}>📊</Text>
            <View style={s.actionText}>
              <Text style={s.actionTitle}>Employee Dashboard</Text>
              <Text style={s.actionDesc}>Leave balance, check-in/out, holidays</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>SYNC & DATA</Text>
          <TouchableOpacity
            style={[s.actionBtn, s.syncBtn, (!isOnline || isSyncing) && s.disabled]}
            onPress={handleManualSync}
            disabled={!isOnline || isSyncing}
          >
            {isSyncing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.actionIcon}>☁️</Text>}
            <View style={s.actionText}>
              <Text style={s.actionTitle}>{isSyncing ? 'Syncing…' : 'Sync to AWS Now'}</Text>
              <Text style={s.actionDesc}>{isOnline ? `${pendingCount} record(s) pending` : 'No connection'}</Text>
            </View>
          </TouchableOpacity>

          {syncResult && (
            <View style={s.resultBox}>
              <Text style={s.resultText}>{syncResult}</Text>
            </View>
          )}

          <TouchableOpacity style={[s.actionBtn, s.purgeBtn]} onPress={handlePurgeSynced}>
            <Text style={s.actionIcon}>🗑️</Text>
            <View style={s.actionText}>
              <Text style={s.actionTitle}>Purge Synced Records</Text>
              <Text style={s.actionDesc}>Remove locally cached records already on AWS</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.dangerBtn]} onPress={handleClearHistory}>
            <Text style={s.actionIcon}>⚠️</Text>
            <View style={s.actionText}>
              <Text style={s.actionTitle}>Clear Auth History</Text>
              <Text style={s.actionDesc}>Delete all authentication attempt logs</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>FACE DATABASE ({embeddings.length})</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#00D4FF" style={{ marginVertical: 24 }} />
          ) : embeddings.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>👤</Text>
              <Text style={s.emptyText}>No enrolled users</Text>
            </View>
          ) : (
            embeddings.map(item => (
              <View key={item.id} style={s.userCard}>
                <View style={s.userAvatar}>
                  <Text style={s.userAvatarText}>{item.userName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={s.userInfo}>
                  <Text style={s.userName}>{item.userName}</Text>
                  <Text style={s.userId}>{item.userId}</Text>
                  <Text style={s.userMeta}>Enrolled {formatDate(item.enrolledAt)}  ·  128D embedding</Text>
                </View>
                <TouchableOpacity
                  style={s.delBtn}
                  onPress={() => handleDeleteUser(item.userId, item.userName)}
                >
                  <Text style={s.delBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={s.footerNote}>
          <Text style={s.footerNoteText}>
            🔒 All facial data is AES-256 encrypted via SQLCipher with hardware-backed keystore. Data never leaves the device without explicit sync.
          </Text>
          <Text style={s.footerCredit}>VisorAI · Built by J Madhan</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const CARD = 'rgba(13,21,48,0.95)';
const BORDER = 'rgba(255,255,255,0.07)';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050B18' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: { color: '#00D4FF', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  dot: { width: 10, height: 10, borderRadius: 5 },

  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  statCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: BORDER,
  },
  statVal: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  statLbl: { fontSize: 9, color: '#718096', fontWeight: '600' },

  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#4A5568', letterSpacing: 1.2, marginBottom: 10, marginTop: 4 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14,
    padding: 14, marginBottom: 10, gap: 12, borderWidth: 1,
  },
  empBtn: { backgroundColor: 'rgba(0,230,118,0.07)', borderColor: 'rgba(0,230,118,0.2)' },
  dashBtn: { backgroundColor: 'rgba(0,212,255,0.07)', borderColor: 'rgba(0,212,255,0.2)' },
  syncBtn: { backgroundColor: 'rgba(0,98,255,0.1)', borderColor: 'rgba(0,98,255,0.25)' },
  purgeBtn: { backgroundColor: 'rgba(255,179,0,0.07)', borderColor: 'rgba(255,179,0,0.2)' },
  dangerBtn: { backgroundColor: 'rgba(255,61,113,0.06)', borderColor: 'rgba(255,61,113,0.18)' },
  disabled: { opacity: 0.45 },
  actionIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  actionDesc: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  chevron: { fontSize: 22, color: '#4A5568' },

  resultBox: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 10, marginBottom: 10 },
  resultText: { fontSize: 13, color: '#fff', textAlign: 'center' },

  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyText: { color: '#4A5568', fontSize: 14 },

  userCard: {
    backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: BORDER,
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#0062FF',
    justifyContent: 'center', alignItems: 'center',
  },
  userAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  userId: { fontSize: 12, color: '#4A5568', marginBottom: 2 },
  userMeta: { fontSize: 10, color: '#2D3748' },
  delBtn: {
    backgroundColor: 'rgba(255,61,113,0.12)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,61,113,0.25)',
  },
  delBtnText: { color: '#FF3D71', fontSize: 12, fontWeight: '700' },

  footerNote: { margin: 16, padding: 14, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, marginBottom: 32, gap: 6 },
  footerNoteText: { fontSize: 12, color: '#2D3748', lineHeight: 18 },
  footerCredit: { fontSize: 11, color: '#4A5568', fontWeight: '600', textAlign: 'center', marginTop: 4 },
});
