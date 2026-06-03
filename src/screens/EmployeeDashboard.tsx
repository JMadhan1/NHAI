import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import {
  getEmployeeById, getAttendanceForEmployee, getLeaveBalance,
  getMonthlyStats, getUpcomingHolidays, checkIn, checkOut,
} from '../services/EmployeeService';
import type { Employee, AttendanceRecord, LeaveBalance, Holiday } from '../types/employee';

interface Props {
  onBack: () => void;
  employeeId?: string;
}

const CARD = 'rgba(13,21,48,0.95)';
const BORDER = 'rgba(255,255,255,0.07)';

export const EmployeeDashboard: React.FC<Props> = ({ onBack, employeeId = 'EMP-001' }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveBalance | null>(null);
  const [stats, setStats] = useState({ present: 0, absent: 0, leaves: 0, holidays: 0, totalDays: 0 });
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayRecord = attendance.find(r => r.date === today);

  const load = useCallback(async () => {
    setLoading(true);
    const [emp, att, lb, st, hols] = await Promise.all([
      getEmployeeById(employeeId),
      getAttendanceForEmployee(employeeId),
      getLeaveBalance(employeeId),
      getMonthlyStats(employeeId),
      Promise.resolve(getUpcomingHolidays(5)),
    ]);
    setEmployee(emp);
    setAttendance(att);
    setLeaves(lb);
    setStats(st);
    setHolidays(hols);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    await checkIn(employeeId);
    await load();
    setCheckingIn(false);
    Alert.alert('✅ Checked In', `Welcome! You are now checked in at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`);
  };

  const handleCheckOut = async () => {
    setCheckingIn(true);
    await checkOut(employeeId);
    await load();
    setCheckingIn(false);
    Alert.alert('👋 Checked Out', 'See you tomorrow! Have a great day.');
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'PRESENT': return '#00E676';
      case 'ABSENT': return '#FF3D71';
      case 'LEAVE': return '#FFB300';
      case 'HOLIDAY': return '#00D4FF';
      case 'HALF_DAY': return '#7B2FFF';
      default: return '#718096';
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'PRESENT': return 'Present';
      case 'ABSENT': return 'Absent';
      case 'LEAVE': return 'On Leave';
      case 'HOLIDAY': return 'Holiday';
      case 'HALF_DAY': return 'Half Day';
      default: return s;
    }
  };

  const formatDate = (d: string) => {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <ActivityIndicator size="large" color="#00D4FF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <SafeAreaView style={s.root}>
        <Text style={{ color: '#fff', padding: 24 }}>Employee not found.</Text>
        <TouchableOpacity onPress={onBack}><Text style={{ color: '#00D4FF', padding: 24 }}>← Back</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  const leaveRemaining = (type: 'annual' | 'sick' | 'casual') =>
    (leaves?.[type]?.total ?? 0) - (leaves?.[type]?.used ?? 0);

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050B18" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>My Dashboard</Text>
          <Text style={s.headerSub}>{employee.employeeId}</Text>
        </View>
        <View style={[s.shiftBadge, { borderColor: '#00D4FF44' }]}>
          <Text style={s.shiftText}>{employee.shift}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Employee Info */}
        <View style={s.empCard}>
          <View style={s.empAvatar}>
            <Text style={s.empAvatarText}>{employee.name.charAt(0)}</Text>
          </View>
          <View style={s.empInfo}>
            <Text style={s.empName}>{employee.name}</Text>
            <Text style={s.empDesig}>{employee.designation}</Text>
            <Text style={s.empDept}>{employee.department}</Text>
          </View>
          <View style={s.shiftCard}>
            <Text style={s.shiftCardTime}>{employee.shiftStart}</Text>
            <Text style={s.shiftCardLabel}>to</Text>
            <Text style={s.shiftCardTime}>{employee.shiftEnd}</Text>
          </View>
        </View>

        {/* TODAY STATUS */}
        <Text style={s.sectionLabel}>TODAY</Text>
        <View style={s.todayCard}>
          <View style={s.todayLeft}>
            {todayRecord?.checkIn ? (
              <>
                <View style={s.todayStatusRow}>
                  <View style={[s.statusDot, { backgroundColor: '#00E676' }]} />
                  <Text style={s.todayStatusText}>Present</Text>
                </View>
                <View style={s.todayTimes}>
                  <View style={s.timeChip}>
                    <Text style={s.timeChipLabel}>CHECK IN</Text>
                    <Text style={s.timeChipValue}>{todayRecord.checkIn}</Text>
                  </View>
                  <View style={[s.timeChip, { borderColor: todayRecord.checkOut ? '#00E67644' : BORDER }]}>
                    <Text style={s.timeChipLabel}>CHECK OUT</Text>
                    <Text style={[s.timeChipValue, { color: todayRecord.checkOut ? '#00E676' : '#4A5568' }]}>
                      {todayRecord.checkOut ?? '--:--'}
                    </Text>
                  </View>
                  {todayRecord.hoursWorked && (
                    <View style={s.timeChip}>
                      <Text style={s.timeChipLabel}>HOURS</Text>
                      <Text style={s.timeChipValue}>{todayRecord.hoursWorked}h</Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={s.todayStatusRow}>
                <View style={[s.statusDot, { backgroundColor: '#FFB300' }]} />
                <Text style={s.todayStatusText}>Not yet checked in</Text>
              </View>
            )}
          </View>

          <View style={s.todayBtns}>
            {!todayRecord?.checkIn ? (
              <TouchableOpacity style={s.checkInBtn} onPress={handleCheckIn} disabled={checkingIn}>
                {checkingIn ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.checkInBtnText}>Check In</Text>}
              </TouchableOpacity>
            ) : !todayRecord?.checkOut ? (
              <TouchableOpacity style={s.checkOutBtn} onPress={handleCheckOut} disabled={checkingIn}>
                {checkingIn ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.checkOutBtnText}>Check Out</Text>}
              </TouchableOpacity>
            ) : (
              <View style={s.doneChip}>
                <Text style={s.doneChipText}>✓ Done</Text>
              </View>
            )}
          </View>
        </View>

        {/* MONTHLY STATS */}
        <Text style={s.sectionLabel}>THIS MONTH — {monthName.toUpperCase()}</Text>
        <View style={s.statsGrid}>
          {[
            { label: 'PRESENT', value: stats.present, color: '#00E676' },
            { label: 'ABSENT', value: stats.absent, color: '#FF3D71' },
            { label: 'ON LEAVE', value: stats.leaves, color: '#FFB300' },
            { label: 'HOLIDAYS', value: stats.holidays, color: '#00D4FF' },
          ].map(item => (
            <View key={item.label} style={[s.statCard, { borderColor: item.color + '33' }]}>
              <Text style={[s.statNum, { color: item.color }]}>{item.value}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* LEAVE BALANCE */}
        <Text style={s.sectionLabel}>LEAVE BALANCE</Text>
        <View style={s.leaveCard}>
          {[
            { key: 'annual', label: 'Annual Leave', icon: '🌴', color: '#00D4FF' },
            { key: 'sick', label: 'Sick Leave', icon: '🏥', color: '#FF3D71' },
            { key: 'casual', label: 'Casual Leave', icon: '☕', color: '#FFB300' },
          ].map((item, i) => {
            const used = leaves?.[item.key as 'annual' | 'sick' | 'casual']?.used ?? 0;
            const total = leaves?.[item.key as 'annual' | 'sick' | 'casual']?.total ?? 0;
            const remaining = total - used;
            const pct = total > 0 ? used / total : 0;
            return (
              <View key={item.key} style={[s.leaveRow, i < 2 && s.leaveRowBorder]}>
                <Text style={s.leaveIcon}>{item.icon}</Text>
                <View style={s.leaveInfo}>
                  <View style={s.leaveTopRow}>
                    <Text style={s.leaveName}>{item.label}</Text>
                    <Text style={[s.leaveRemain, { color: remaining < 3 ? '#FF3D71' : item.color }]}>
                      {remaining} left
                    </Text>
                  </View>
                  <View style={s.leaveBar}>
                    <View style={[s.leaveBarFill, { width: `${pct * 100}%`, backgroundColor: item.color }]} />
                  </View>
                  <Text style={s.leaveUsed}>{used} used of {total} days</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* UPCOMING HOLIDAYS */}
        <Text style={s.sectionLabel}>UPCOMING HOLIDAYS</Text>
        <View style={s.holidayCard}>
          {holidays.length === 0 ? (
            <Text style={{ color: '#4A5568', padding: 12 }}>No upcoming holidays</Text>
          ) : holidays.map((h, i) => (
            <View key={h.date} style={[s.holidayRow, i < holidays.length - 1 && s.holidayRowBorder]}>
              <View style={s.holidayDateBox}>
                <Text style={s.holidayDay}>{new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric' })}</Text>
                <Text style={s.holidayMon}>{new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}</Text>
              </View>
              <View style={s.holidayInfo}>
                <Text style={s.holidayName}>{h.name}</Text>
                <Text style={s.holidayType}>{h.type}</Text>
              </View>
              <View style={[s.holidayBadge, { backgroundColor: '#00D4FF18' }]}>
                <Text style={[s.holidayBadgeText, { color: '#00D4FF' }]}>🏖️</Text>
              </View>
            </View>
          ))}
        </View>

        {/* RECENT ATTENDANCE */}
        <Text style={s.sectionLabel}>RECENT ATTENDANCE</Text>
        <View style={s.histCard}>
          {attendance.slice(0, 10).map((r, i) => (
            <View key={r.id} style={[s.histRow, i < 9 && s.histRowBorder]}>
              <View style={s.histDate}>
                <Text style={s.histDateText}>{formatDate(r.date)}</Text>
              </View>
              <View style={s.histTimes}>
                {r.checkIn ? (
                  <Text style={s.histTimeText}>{r.checkIn} → {r.checkOut ?? '--:--'}</Text>
                ) : (
                  <Text style={[s.histTimeText, { color: '#4A5568' }]}>—</Text>
                )}
              </View>
              <View style={[s.histBadge, { borderColor: statusColor(r.status) + '44', backgroundColor: statusColor(r.status) + '15' }]}>
                <Text style={[s.histBadgeText, { color: statusColor(r.status) }]}>{statusLabel(r.status)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>VisorAI · Built by J Madhan</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050B18' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { color: '#fff', fontSize: 18 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 11, color: '#4A5568', marginTop: 1 },
  shiftBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, backgroundColor: 'rgba(0,212,255,0.08)' },
  shiftText: { fontSize: 10, fontWeight: '800', color: '#00D4FF', letterSpacing: 1 },
  scroll: { padding: 16, paddingBottom: 40 },

  empCard: {
    backgroundColor: CARD, borderRadius: 18, padding: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: BORDER,
  },
  empAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#0062FF', justifyContent: 'center', alignItems: 'center' },
  empAvatarText: { fontSize: 22, fontWeight: '900', color: '#fff' },
  empInfo: { flex: 1 },
  empName: { fontSize: 17, fontWeight: '800', color: '#fff' },
  empDesig: { fontSize: 12, color: '#00D4FF', marginTop: 2 },
  empDept: { fontSize: 11, color: '#4A5568', marginTop: 2 },
  shiftCard: { alignItems: 'center', padding: 8, backgroundColor: 'rgba(0,212,255,0.08)', borderRadius: 10 },
  shiftCardTime: { fontSize: 14, fontWeight: '800', color: '#fff' },
  shiftCardLabel: { fontSize: 9, color: '#4A5568' },

  sectionLabel: { fontSize: 10, color: '#4A5568', fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },

  todayCard: {
    backgroundColor: CARD, borderRadius: 18, padding: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: BORDER,
  },
  todayLeft: { flex: 1 },
  todayStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  todayStatusText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  todayTimes: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  timeChip: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, borderWidth: 1, borderColor: BORDER, minWidth: 64 },
  timeChipLabel: { fontSize: 8, color: '#4A5568', fontWeight: '700', letterSpacing: 0.8 },
  timeChipValue: { fontSize: 14, fontWeight: '800', color: '#fff', marginTop: 2 },
  todayBtns: { marginLeft: 12 },
  checkInBtn: { backgroundColor: '#00E676', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  checkInBtnText: { color: '#000', fontSize: 13, fontWeight: '800' },
  checkOutBtn: { backgroundColor: '#FF3D71', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  checkOutBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  doneChip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,230,118,0.15)', borderRadius: 10 },
  doneChipText: { color: '#00E676', fontSize: 12, fontWeight: '700' },

  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 12,
    alignItems: 'center', borderWidth: 1,
  },
  statNum: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 8, color: '#4A5568', fontWeight: '700', letterSpacing: 0.8, textAlign: 'center' },

  leaveCard: { backgroundColor: CARD, borderRadius: 18, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  leaveRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  leaveRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  leaveIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  leaveInfo: { flex: 1 },
  leaveTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  leaveName: { fontSize: 14, color: '#fff', fontWeight: '600' },
  leaveRemain: { fontSize: 13, fontWeight: '800' },
  leaveBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 4, overflow: 'hidden' },
  leaveBarFill: { height: 4, borderRadius: 2 },
  leaveUsed: { fontSize: 10, color: '#4A5568' },

  holidayCard: { backgroundColor: CARD, borderRadius: 18, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  holidayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  holidayRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  holidayDateBox: { width: 40, alignItems: 'center', backgroundColor: 'rgba(0,212,255,0.1)', borderRadius: 8, padding: 6 },
  holidayDay: { fontSize: 18, fontWeight: '900', color: '#00D4FF' },
  holidayMon: { fontSize: 9, color: '#00D4FF', fontWeight: '600' },
  holidayInfo: { flex: 1 },
  holidayName: { fontSize: 14, color: '#fff', fontWeight: '600' },
  holidayType: { fontSize: 10, color: '#4A5568', marginTop: 2 },
  holidayBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  holidayBadgeText: { fontSize: 16 },

  histCard: { backgroundColor: CARD, borderRadius: 18, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  histRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10 },
  histRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  histDate: { width: 90 },
  histDateText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  histTimes: { flex: 1 },
  histTimeText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontVariant: ['tabular-nums'] },
  histBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  histBadgeText: { fontSize: 10, fontWeight: '700' },

  footer: { alignItems: 'center', marginTop: 8 },
  footerText: { fontSize: 11, color: '#1E2840', fontWeight: '600' },
});
