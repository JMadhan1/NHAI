import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { manualSync } from '../services/SyncService';
import { setSyncing, setSyncComplete } from '../store/syncSlice';

export const SyncStatusBar: React.FC = () => {
  const { isOnline, pendingCount, isSyncing } = useSelector((s: RootState) => s.sync);
  const dispatch = useDispatch();

  const handleManualSync = async () => {
    dispatch(setSyncing(true));
    const result = await manualSync();
    dispatch(setSyncComplete({ at: Date.now(), error: result.errors[0] }));
  };

  if (pendingCount === 0) return null;

  return (
    <View style={styles.bar}>
      <Text style={styles.label}>
        {pendingCount} record{pendingCount !== 1 ? 's' : ''} pending sync
      </Text>
      {isOnline && !isSyncing && (
        <TouchableOpacity style={styles.btn} onPress={handleManualSync}>
          <Text style={styles.btnText}>Sync Now</Text>
        </TouchableOpacity>
      )}
      {isSyncing && <ActivityIndicator size="small" color="#007AFF" />}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f4ff',
    borderBottomWidth: 0.5,
    borderColor: '#cce',
  },
  label: { fontSize: 13, color: '#333' },
  btn: { backgroundColor: '#007AFF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
