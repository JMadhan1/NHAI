import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getAllEmbeddings, deleteEmbedding } from '../services/StorageService';
import { OfflineBanner } from '../components/OfflineBanner';
import { SyncStatusBar } from '../components/SyncStatusBar';
import type { FaceEmbedding } from '../types';

interface Props {
  onBack: () => void;
}

export const AdminScreen: React.FC<Props> = ({ onBack }) => {
  const [embeddings, setEmbeddings] = useState<FaceEmbedding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmbeddings();
  }, []);

  const loadEmbeddings = async () => {
    try {
      setLoading(true);
      const data = await getAllEmbeddings();
      setEmbeddings(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load enrolled users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    Alert.alert('Delete User', `Are you sure you want to delete ${userName}?`, [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteEmbedding(userId);
            setEmbeddings(embeddings.filter(e => e.userId !== userId));
            Alert.alert('Success', `${userName} has been deleted`);
          } catch (err) {
            Alert.alert('Error', 'Failed to delete user');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.count}>{embeddings.length}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Manage enrolled users and their facial data. All data is encrypted locally and never transmitted without consent.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : embeddings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No enrolled users</Text>
        </View>
      ) : (
        <FlatList
          data={embeddings}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.userName}</Text>
                <Text style={styles.userId}>ID: {item.userId}</Text>
                <Text style={styles.enrollDate}>Enrolled: {formatDate(item.enrolledAt)}</Text>
                <Text style={styles.vectorInfo}>Embedding: {item.vector.length} dimensions</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteUser(item.userId, item.userName)}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <View style={styles.footer}>
        <View style={styles.footerStat}>
          <Text style={styles.footerLabel}>Total Users</Text>
          <Text style={styles.footerValue}>{embeddings.length}</Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={styles.footerLabel}>Database</Text>
          <Text style={styles.footerValue}>AES-256</Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={styles.footerLabel}>Mode</Text>
          <Text style={styles.footerValue}>Offline</Text>
        </View>
      </View>

      <SyncStatusBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  backBtn: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  count: { fontSize: 16, fontWeight: '700', color: '#007AFF' },
  infoBox: { paddingHorizontal: 24, paddingVertical: 12 },
  infoText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
  listContent: { paddingHorizontal: 24, paddingVertical: 8 },
  userCard: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  userId: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  enrollDate: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  vectorInfo: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  deleteBtn: { backgroundColor: '#f44336', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deleteBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  footer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 24, paddingVertical: 12, gap: 12 },
  footerStat: { flex: 1, alignItems: 'center' },
  footerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 },
  footerValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
