import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllData } from '../services/StorageService';

const SETTINGS_KEY = 'app_settings_v1';

interface AppSettings {
  autoSync: boolean;
  hapticFeedback: boolean;
  challengeCount: number;
  matchThreshold: number;
  awsEndpoint: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoSync: true,
  hapticFeedback: true,
  challengeCount: 2,
  matchThreshold: 60,
  awsEndpoint: '',
};

interface Props {
  onBack: () => void;
}

export const SettingsScreen: React.FC<Props> = ({ onBack }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [endpointInput, setEndpointInput] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as AppSettings;
        setSettings({ ...DEFAULT_SETTINGS, ...saved });
        setEndpointInput(saved.awsEndpoint || '');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = useCallback(async (updated: AppSettings) => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      setSettings(updated);
    } catch (err) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleSetting = useCallback((key: keyof AppSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    saveSettings(updated);
  }, [settings, saveSettings]);

  const handleSaveEndpoint = useCallback(() => {
    const trimmed = endpointInput.trim();
    if (trimmed && !trimmed.startsWith('https://')) {
      Alert.alert('Invalid URL', 'AWS endpoint must start with https://');
      return;
    }
    const updated = { ...settings, awsEndpoint: trimmed };
    saveSettings(updated);
    Alert.alert('Saved', 'AWS endpoint updated successfully.');
  }, [endpointInput, settings, saveSettings]);

  const handleChallengeCount = useCallback((delta: number) => {
    const next = Math.min(5, Math.max(1, settings.challengeCount + delta));
    saveSettings({ ...settings, challengeCount: next });
  }, [settings, saveSettings]);

  const handleThresholdChange = useCallback((delta: number) => {
    const next = Math.min(95, Math.max(50, settings.matchThreshold + delta));
    saveSettings({ ...settings, matchThreshold: next });
  }, [settings, saveSettings]);

  const handleClearAllData = useCallback(() => {
    Alert.alert(
      '⚠️  Clear All Data',
      'This will permanently delete ALL enrolled users, authentication history, and sync queue. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert('Done', 'All local data has been cleared.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to clear data');
            }
          },
        },
      ]
    );
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        {saving ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync & Network</Text>

          <View style={styles.row}>
            <View style={styles.rowTextGroup}>
              <Text style={styles.rowLabel}>Auto Sync</Text>
              <Text style={styles.rowDesc}>Automatically upload to AWS when online</Text>
            </View>
            <Switch
              value={settings.autoSync}
              onValueChange={() => toggleSetting('autoSync')}
              trackColor={{ false: '#3a3a3a', true: '#007AFF' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.rowSeparator} />

          <View style={styles.inputRow}>
            <Text style={styles.rowLabel}>AWS API Endpoint</Text>
            <TextInput
              style={styles.textInput}
              value={endpointInput}
              onChangeText={setEndpointInput}
              placeholder="https://your-api.amazonaws.com/prod"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEndpoint}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Face Recognition</Text>

          <View style={styles.row}>
            <View style={styles.rowTextGroup}>
              <Text style={styles.rowLabel}>Match Threshold</Text>
              <Text style={styles.rowDesc}>Minimum cosine similarity for a match</Text>
            </View>
            <View style={styles.stepperGroup}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => handleThresholdChange(-5)}>
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{settings.matchThreshold}%</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => handleThresholdChange(5)}>
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.rowSeparator} />

          <View style={styles.row}>
            <View style={styles.rowTextGroup}>
              <Text style={styles.rowLabel}>Liveness Challenges</Text>
              <Text style={styles.rowDesc}>Number of challenges per auth attempt</Text>
            </View>
            <View style={styles.stepperGroup}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => handleChallengeCount(-1)}>
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{settings.challengeCount}</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => handleChallengeCount(1)}>
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback</Text>

          <View style={styles.row}>
            <View style={styles.rowTextGroup}>
              <Text style={styles.rowLabel}>Haptic Feedback</Text>
              <Text style={styles.rowDesc}>Vibrate on liveness challenge success/fail</Text>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={() => toggleSetting('hapticFeedback')}
              trackColor={{ false: '#3a3a3a', true: '#007AFF' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>App Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.rowSeparator} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Build Date</Text>
            <Text style={styles.rowValue}>June 2026</Text>
          </View>
          <View style={styles.rowSeparator} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>AI Models</Text>
            <Text style={styles.rowValue}>BlazeFace + MobileFaceNet</Text>
          </View>
          <View style={styles.rowSeparator} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Encryption</Text>
            <Text style={styles.rowValue}>AES-256 / SQLCipher</Text>
          </View>
          <View style={styles.rowSeparator} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Framework</Text>
            <Text style={styles.rowValue}>React Native 0.73.6</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearAllData}>
          <Text style={styles.dangerBtnText}>🗑️  Clear All Local Data</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  content: { flex: 1 },

  section: {
    backgroundColor: 'rgba(21,26,58,0.7)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rowTextGroup: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 15, color: '#fff', fontWeight: '500' },
  rowDesc: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  rowValue: { fontSize: 14, color: '#718096' },

  inputRow: {
    paddingVertical: 14,
    gap: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  stepperGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  stepperValue: { fontSize: 17, fontWeight: '700', color: '#fff', minWidth: 48, textAlign: 'center' },

  dangerBtn: {
    backgroundColor: 'rgba(244,67,54,0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.25)',
  },
  dangerBtnText: { color: '#f44336', fontSize: 15, fontWeight: '700' },
});
