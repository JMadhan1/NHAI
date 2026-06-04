import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { getCurrentSession, logout } from '../services/SessionService';
import { getUserAccount, UserAccount } from '../services/AccountService';
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceHistory,
  getMonthlyStats,
  getStreak,
  hasCheckedInToday,
  hasCheckedOutToday,
  type AttendanceRecord,
} from '../services/AttendanceService';

interface Props {
  onLogout: () => void;
  onNavigateToProfile: (userId: string) => void;
}

export const PersonalDashboard: React.FC<Props> = ({ onLogout, onNavigateToProfile }) => {
  const [profile, setProfile] = useState<UserAccount | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, leave: 0, halfDay: 0, totalHours: 0 });
  const [streak, setStreak] = useState(0);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const session = await getCurrentSession();
      if (!session) {
        setError('Session expired. Please login again.');
        return;
      }

      let account = await getUserAccount(session.userId);
      if (!account) {
        account = {
          id: session.userId,
          username: session.username,
          passwordHash: '',
          email: '',
          fullName: session.username,
          faceEmbedding: [],
          enrollmentDate: new Date().toISOString(),
          active: true,
          createdAt: new Date().toISOString(),
        };
      }
      setProfile(account);

      const today = await getTodayAttendance(session.userId);
      setTodayRecord(today);
      setCheckedIn(await hasCheckedInToday(session.userId));
      setCheckedOut(await hasCheckedOutToday(session.userId));

      const hist = await getAttendanceHistory(session.userId, 30);
      setHistory(hist);

      const thisMonth = new Date().toISOString().slice(0, 7);
      const monthly = await getMonthlyStats(session.userId, thisMonth);
      setStats(monthly);

      const s = await getStreak(session.userId);
      setStreak(s);
    } catch (err: any) {
      console.error('[DASHBOARD] Load error:', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCheckIn = async () => {
    try {
      const session = await getCurrentSession();
      if (!session) return;
      const record = await checkIn(session.userId, 'Site Office');
      setTodayRecord(record);
      setCheckedIn(true);
      Alert.alert('Checked In', `Checked in at ${record.checkIn}`);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      const session = await getCurrentSession();
      if (!session) return;
      const record = await checkOut(session.userId);
      if (record) {
        setTodayRecord(record);
        setCheckedOut(true);
        Alert.alert('Checked Out', `Worked ${record.workHours.toFixed(1)} hours`);
        loadData();
      } else {
        Alert.alert('Error', 'No check-in record found for today');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Check-out failed');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          onLogout();
        },
      },
    ]);
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '--:--';
    return timeStr.substring(0, 5);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#00D4FF" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error || 'Failed to load profile'}</Text>
        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Return to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const todayDisplay = checkedIn
    ? checkedOut
      ? { text: `Checked out at ${formatTime(todayRecord?.checkOut)}`, color: '#2196F3' }
      : { text: `Checked in at ${formatTime(todayRecord?.checkIn)}`, color: '#4CAF50' }
    : { text: 'Not checked in yet', color: '#9CA3AF' };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Welcome, {profile.fullName}</Text>
          <Text style={styles.subtitle}>@{profile.username}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Check-in / Check-out Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Attendance</Text>
        <View style={[styles.statusBox, { borderLeftColor: todayDisplay.color }]}>
          <Text style={[styles.statusText, { color: todayDisplay.color }]}>
            {todayDisplay.text}
          </Text>
          {todayRecord && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.timeDetail}>Check In: {formatTime(todayRecord.checkIn)}</Text>
              {todayRecord.checkOut && (
                <Text style={styles.timeDetail}>Check Out: {formatTime(todayRecord.checkOut)}</Text>
              )}
              {todayRecord.workHours > 0 && (
                <Text style={styles.timeDetail}>Work Hours: {todayRecord.workHours.toFixed(1)}h</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          {!checkedIn && (
            <TouchableOpacity style={[styles.actionBtn, styles.checkInBtn]} onPress={handleCheckIn}>
              <Text style={styles.actionBtnText}>Check In</Text>
            </TouchableOpacity>
          )}
          {checkedIn && !checkedOut && (
            <TouchableOpacity style={[styles.actionBtn, styles.checkOutBtn]} onPress={handleCheckOut}>
              <Text style={styles.actionBtnText}>Check Out</Text>
            </TouchableOpacity>
          )}
          {checkedIn && checkedOut && (
            <View style={[styles.actionBtn, styles.completedBtn]}>
              <Text style={styles.actionBtnText}>Completed</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>This Month</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, styles.statPresent]}>
            <Text style={styles.statNumber}>{stats.present}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={[styles.statBox, styles.statLeave]}>
            <Text style={styles.statNumber}>{stats.leave}</Text>
            <Text style={styles.statLabel}>Leaves</Text>
          </View>
          <View style={[styles.statBox, styles.statAbsent]}>
            <Text style={styles.statNumber}>{stats.absent}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: 'rgba(0,212,255,0.15)' }]}>
            <Text style={styles.statNumber}>{stats.halfDay}</Text>
            <Text style={styles.statLabel}>Half Day</Text>
          </View>
        </View>
        <View style={styles.hoursRow}>
          <Text style={styles.hoursLabel}>Total Work Hours:</Text>
          <Text style={styles.hoursValue}>{stats.totalHours.toFixed(1)}h</Text>
        </View>
        <View style={styles.hoursRow}>
          <Text style={styles.hoursLabel}>Current Streak:</Text>
          <Text style={styles.hoursValue}>{streak} days</Text>
        </View>
      </View>

      {/* Attendance History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Attendance</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>No attendance records yet</Text>
        ) : (
          history.map((record) => (
            <View key={record.id} style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>{formatDate(record.date)}</Text>
                <Text style={styles.historyStatus}>{record.status}</Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyTime}>{formatTime(record.checkIn)}</Text>
                {record.checkOut && (
                  <Text style={styles.historyTimeOut}>→ {formatTime(record.checkOut)}</Text>
                )}
                {record.workHours > 0 && (
                  <Text style={styles.historyHours}>{record.workHours.toFixed(1)}h</Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* NHAI Project Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>NHAI Project Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Project:</Text>
          <Text style={styles.infoValue}>Highway Maintenance Unit</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Zone:</Text>
          <Text style={styles.infoValue}>South Zone - Tamil Nadu</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Shift:</Text>
          <Text style={styles.infoValue}>General (9:00 AM - 5:30 PM)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Safety Status:</Text>
          <Text style={[styles.infoValue, { color: '#4CAF50' }]}>All Clear</Text>
        </View>
      </View>

      {/* Profile Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{profile.fullName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{profile.email || 'Not provided'}</Text>
        </View>
        {profile.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{profile.phone}</Text>
          </View>
        )}
        {profile.department && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Department:</Text>
            <Text style={styles.infoValue}>{profile.department}</Text>
          </View>
        )}
        {profile.designation && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Designation:</Text>
            <Text style={styles.infoValue}>{profile.designation}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={[styles.infoValue, { color: profile.active ? '#4CAF50' : '#f44336' }]}>
            {profile.active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* NHAI Guidelines */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>NHAI Guidelines</Text>
        <Text style={styles.guidelineItem}>• Wear safety helmet and vest at site</Text>
        <Text style={styles.guidelineItem}>• Report any incidents immediately</Text>
        <Text style={styles.guidelineItem}>• Maintain vehicle log records daily</Text>
        <Text style={styles.guidelineItem}>• Follow speed limits on highway zones</Text>
        <Text style={styles.guidelineItem}>• Use biometric check-in for attendance</Text>
      </View>

      {/* Account Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>
        <TouchableOpacity style={styles.settingButton} onPress={() => onNavigateToProfile(profile.id)}>
          <Text style={styles.settingText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingButton} onPress={() => onNavigateToProfile(profile.id)}>
          <Text style={styles.settingText}>Re-enroll Face</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingButton, styles.logoutSetting]} onPress={handleLogout}>
          <Text style={[styles.settingText, { color: '#ff7675' }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>NHAI FaceAuth | Data stored locally on device</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050B18', padding: 16 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 14 },
  errorText: { color: '#ff7675', fontSize: 14, marginBottom: 20, textAlign: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  headerContent: { flex: 1 },
  greeting: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  logoutBtn: {
    backgroundColor: 'rgba(244,67,54,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: { color: '#ff7675', fontWeight: '600', fontSize: 12 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },

  statusBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
  },
  statusText: { fontSize: 14, fontWeight: '600' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  infoLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  infoValue: { fontSize: 13, color: '#fff', fontWeight: '500' },

  editButton: {
    backgroundColor: '#00D4FF',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  editButtonText: { color: '#050B18', fontWeight: '700', fontSize: 13 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statPresent: { backgroundColor: 'rgba(76,175,80,0.15)' },
  statAbsent: { backgroundColor: 'rgba(244,67,54,0.15)' },
  statLeave: { backgroundColor: 'rgba(255,152,0,0.15)' },
  statHoliday: { backgroundColor: 'rgba(33,150,243,0.15)' },
  statNumber: { fontSize: 24, fontWeight: '900', color: '#00D4FF', marginBottom: 4 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },

  settingButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,212,255,0.1)',
    borderRadius: 6,
    marginBottom: 8,
  },
  settingText: { fontSize: 13, color: '#00D4FF', fontWeight: '600' },

  button: {
    backgroundColor: '#00D4FF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#050B18', fontWeight: '700', fontSize: 14 },

  actionRow: { flexDirection: 'row', marginTop: 16 },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  checkInBtn: { backgroundColor: '#4CAF50' },
  checkOutBtn: { backgroundColor: '#FF9800' },
  completedBtn: { backgroundColor: 'rgba(255,255,255,0.1)' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  timeDetail: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', marginTop: 8 },
  hoursLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  hoursValue: { fontSize: 13, color: '#00D4FF', fontWeight: '700' },

  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyLeft: { flex: 1 },
  historyDate: { fontSize: 13, color: '#fff', fontWeight: '600' },
  historyStatus: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyTime: { fontSize: 13, color: '#00D4FF', fontWeight: '600' },
  historyTimeOut: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  historyHours: { fontSize: 11, color: '#4CAF50', marginTop: 2 },
  emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingVertical: 16 },

  guidelineItem: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8, lineHeight: 18 },
  logoutSetting: { backgroundColor: 'rgba(244,67,54,0.1)' },

  footer: { alignItems: 'center', marginVertical: 24 },
  footerText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
});
