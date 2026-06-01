import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

export const OfflineBanner: React.FC = () => {
  const isOnline = useSelector((s: RootState) => s.sync.isOnline);
  if (isOnline) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.text}>
        Offline Mode — Authentication works without network. Data will sync when connected.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  icon: { fontSize: 16 },
  text: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '500' },
});
