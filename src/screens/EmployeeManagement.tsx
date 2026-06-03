import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, TextInput, StatusBar,
  Alert,
} from 'react-native';
import {
  getAllEmployees, getTodayAttendanceAll, getMonthlyStats,
} from '../services/EmployeeService';
import type { Employee, AttendanceRecord } from '../types/employee';

interface Props {
  onBack: () => void;
  onViewEmployee?: (employeeId: string) => void;
}

const CARD = 'rgba(13,21,48,0.95)';
const BORDER = 'rgba(255,255,255,0.07)';

const DEPT_COLORS: Record<string, string> = {
  'Operations': '#00D4FF',
  'IT Support': '#7B2FFF',
  'Field Services': '#FF6B35',
  'Administration': '#00E676',
  'Security': '#FFB300',
};

const SHIFT_TIMES: Record<string, string> = {
  MORNING: '06:00–14:00',
  AFTERNOON: '14:00–22:00',
  NIGHT: '22:00–06:00',
};

export const EmployeeManagement: React.FC<Props> = ({ onBack, onViewEmployee }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayAtt, setTodayAtt] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState<string>('All');
  const [filterShift, setFilterShift] = useState<string>('All');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    setLoading(true);
    const [emps, att] = await Promise.all([getAllEmployees(), getTodayAttendanceAll()]);
    setEmployees(emps);
    setTodayAtt(att);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const depts = ['All', ...Array.from(new Set(employees.map(e => e.department)))];
  const shifts = ['All', 'MORNING', 'AFTERNOON', 'NIGHT'];

  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'All' || e.department === filterDept;
    const matchShift = filterShift === 'All' || e.shift === filterShift;
    return matchSearch && matchDept && matchShift;
  });

  const todayPresent = todayAtt.filter(r => r.status === 'PRESENT').length;
  const todayAbsent = employees.length - todayPresent;
  const enrolledFace = employees.filter(e => e.enrolledFace).length;

  const getEmpStatus = (emp: Employee) => {
    const rec = todayAtt.find(r => r.employeeId === emp.employeeId);
    if (!rec) return { label: 'Absent', color: '#FF3D71' };
    if (rec.status === 'PRESENT') {
      if (rec.checkOut) return { label: `Out ${rec.checkOut}`, color: '#00E676' };
      return { label: `In ${rec.checkIn}`, color: '#00E676' };
    }
    if (rec.status === 'LEAVE') return { label: 'On Leave', color: '#FFB300' };
    if (rec.status === 'HOLIDAY') return { label: 'Holiday', color: '#00D4FF' };
    return { label: 'Absent', color: '#FF3D71' };
  };

  const EmpDetailModal: React.FC<{ emp: Employee }> = ({ emp }) => {
    const status = getEmpStatus(emp);
    const rec = todayAtt.find(r => r.employeeId === emp.employeeId);
    const color = DEPT_COLORS[emp.department] ?? '#718096';
    return (
      <View style={d.modal}>
        <View style={d.modalContent}>
          <View style={d.modalHeader}>
            <View style={[d.modalAvatar, { backgroundColor: color + '22', borderColor: color + '44' }]}>
              <Text style={[d.modalAvatarText, { color }]}>{emp.name.charAt(0)}</Text>
            </View>
            <View style={d.modalInfo}>
              <Text style={d.modalName}>{emp.name}</Text>
              <Text style={d.modalDesig}>{emp.designation}</Text>
              <Text style={[d.modalDept, { color }]}>{emp.department}</Text>
            </View>
            <TouchableOpacity style={d.closeBtn} onPress={() => setSelectedEmp(null)}>
              <Text style={d.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {[
            ['Employee ID', emp.employeeId],
            ['Shift', `${emp.shift}  ·  ${SHIFT_TIMES[emp.shift]}`],
            ['Joined', new Date(emp.joinDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })],
            ['Phone', emp.phone],
            ['Face Enrolled', emp.enrolledFace ? '✅ Yes' : '❌ Not enrolled'],
            ["Today's Status", status.label],
          ].map(([k, v], i) => (
            <View key={k} style={d.detailRow}>
              <Text style={d.detailKey}>{k}</Text>
              <Text style={[d.detailVal, k === "Today's Status" && { color: status.color }]}>{v}</Text>
            </View>
          ))}

          {rec?.checkIn && (
            <View style={d.timeRow}>
              <View style={d.timeBox}>
                <Text style={d.timeLabel}>CHECK IN</Text>
                <Text style={d.timeVal}>{rec.checkIn}</Text>
              </View>
              <View style={[d.timeBox, { borderColor: rec.checkOut ? '#00E67644' : BORDER }]}>
                <Text style={d.timeLabel}>CHECK OUT</Text>
                <Text style={[d.timeVal, { color: rec.checkOut ? '#00E676' : '#4A5568' }]}>{rec.checkOut ?? '--:--'}</Text>
              </View>
              {rec.hoursWorked && (
                <View style={d.timeBox}>
                  <Text style={d.timeLabel}>HOURS</Text>
                  <Text style={d.timeVal}>{rec.hoursWorked}h</Text>
                </View>
              )}
            </View>
          )}

          <View style={d.modalBtns}>
            {onViewEmployee && (
              <TouchableOpacity
                style={d.viewDashBtn}
                onPress={() => { setSelectedEmp(null); onViewEmployee(emp.employeeId); }}
              >
                <Text style={d.viewDashBtnText}>View Dashboard</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={d.closeModalBtn} onPress={() => setSelectedEmp(null)}>
              <Text style={d.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050B18" />

      {selectedEmp && <EmpDetailModal emp={selectedEmp} />}

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Employee Management</Text>
          <Text style={s.headerSub}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={load}>
          <Text style={s.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00D4FF" style={{ flex: 1 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* Summary Row */}
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { borderColor: '#00D4FF33' }]}>
              <Text style={[s.summaryNum, { color: '#00D4FF' }]}>{employees.length}</Text>
              <Text style={s.summaryLabel}>TOTAL STAFF</Text>
            </View>
            <View style={[s.summaryCard, { borderColor: '#00E67633' }]}>
              <Text style={[s.summaryNum, { color: '#00E676' }]}>{todayPresent}</Text>
              <Text style={s.summaryLabel}>PRESENT TODAY</Text>
            </View>
            <View style={[s.summaryCard, { borderColor: '#FF3D7133' }]}>
              <Text style={[s.summaryNum, { color: '#FF3D71' }]}>{todayAbsent}</Text>
              <Text style={s.summaryLabel}>ABSENT</Text>
            </View>
            <View style={[s.summaryCard, { borderColor: '#7B2FFF33' }]}>
              <Text style={[s.summaryNum, { color: '#7B2FFF' }]}>{enrolledFace}</Text>
              <Text style={s.summaryLabel}>FACE ENROLLED</Text>
            </View>
          </View>

          {/* Search */}
          <View style={s.searchBox}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or ID…"
              placeholderTextColor="#4A5568"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={s.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Dept Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
            {depts.map(d => (
              <TouchableOpacity
                key={d}
                style={[s.filterChip, filterDept === d && s.filterChipActive]}
                onPress={() => setFilterDept(d)}
              >
                <Text style={[s.filterChipText, filterDept === d && s.filterChipTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
            {shifts.map(sh => (
              <TouchableOpacity
                key={sh}
                style={[s.filterChip, filterShift === sh && s.filterChipActiveShift]}
                onPress={() => setFilterShift(sh)}
              >
                <Text style={[s.filterChipText, filterShift === sh && s.filterChipTextActive]}>
                  {sh === 'All' ? '— All Shifts' : sh}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Shift Schedule Summary */}
          <Text style={s.sectionLabel}>SHIFT SCHEDULE TODAY</Text>
          <View style={s.shiftRow}>
            {(['MORNING', 'AFTERNOON', 'NIGHT'] as const).map(sh => {
              const shEmp = employees.filter(e => e.shift === sh);
              return (
                <View key={sh} style={s.shiftCard}>
                  <Text style={s.shiftCardName}>{sh}</Text>
                  <Text style={s.shiftCardTime}>{SHIFT_TIMES[sh]}</Text>
                  <Text style={s.shiftCardCount}>{shEmp.length} staff</Text>
                </View>
              );
            })}
          </View>

          {/* Employee List */}
          <Text style={s.sectionLabel}>EMPLOYEES ({filtered.length})</Text>
          {filtered.map(emp => {
            const status = getEmpStatus(emp);
            const color = DEPT_COLORS[emp.department] ?? '#718096';
            return (
              <TouchableOpacity
                key={emp.id}
                style={s.empCard}
                onPress={() => setSelectedEmp(emp)}
                activeOpacity={0.8}
              >
                <View style={[s.empAvatar, { backgroundColor: color + '22', borderColor: color + '44' }]}>
                  <Text style={[s.empAvatarText, { color }]}>{emp.name.charAt(0)}</Text>
                </View>
                <View style={s.empMain}>
                  <View style={s.empTopRow}>
                    <Text style={s.empName}>{emp.name}</Text>
                    <View style={[s.statusBadge, { borderColor: status.color + '44', backgroundColor: status.color + '15' }]}>
                      <Text style={[s.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                  <Text style={s.empDesig}>{emp.designation}</Text>
                  <View style={s.empMeta}>
                    <View style={[s.deptChip, { backgroundColor: color + '18', borderColor: color + '33' }]}>
                      <Text style={[s.deptChipText, { color }]}>{emp.department}</Text>
                    </View>
                    <Text style={s.empId}>{emp.employeeId}</Text>
                    <Text style={s.empShift}>{emp.shift}</Text>
                    {!emp.enrolledFace && (
                      <View style={s.noFaceChip}>
                        <Text style={s.noFaceText}>No Face</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            );
          })}

          {filtered.length === 0 && (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>👥</Text>
              <Text style={s.emptyText}>No employees match your filters</Text>
            </View>
          )}

          <View style={s.footer}>
            <Text style={s.footerText}>VisorAI · Built by J Madhan</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050B18' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { color: '#fff', fontSize: 18 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 11, color: '#4A5568', marginTop: 1 },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center' },
  refreshIcon: { color: '#00D4FF', fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },

  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 10,
    alignItems: 'center', borderWidth: 1,
  },
  summaryNum: { fontSize: 22, fontWeight: '900', marginBottom: 3 },
  summaryLabel: { fontSize: 7, color: '#4A5568', fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 12,
    borderWidth: 1, borderColor: BORDER, marginBottom: 12, gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 12 },
  clearSearch: { color: '#4A5568', fontSize: 16, padding: 4 },

  filterRow: { marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, marginRight: 8,
  },
  filterChipActive: { borderColor: '#00D4FF88', backgroundColor: 'rgba(0,212,255,0.12)' },
  filterChipActiveShift: { borderColor: '#7B2FFF88', backgroundColor: 'rgba(123,47,255,0.12)' },
  filterChipText: { fontSize: 12, color: '#4A5568', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },

  sectionLabel: { fontSize: 10, color: '#4A5568', fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },

  shiftRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  shiftCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: BORDER,
  },
  shiftCardName: { fontSize: 10, fontWeight: '800', color: '#00D4FF', letterSpacing: 1, marginBottom: 4 },
  shiftCardTime: { fontSize: 11, color: '#fff', fontWeight: '600', marginBottom: 4 },
  shiftCardCount: { fontSize: 10, color: '#4A5568' },

  empCard: {
    backgroundColor: CARD, borderRadius: 16, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: BORDER,
  },
  empAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  empAvatarText: { fontSize: 20, fontWeight: '900' },
  empMain: { flex: 1 },
  empTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  empName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  empDesig: { fontSize: 12, color: '#4A5568', marginBottom: 6 },
  empMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  deptChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  deptChipText: { fontSize: 10, fontWeight: '600' },
  empId: { fontSize: 10, color: '#4A5568' },
  empShift: { fontSize: 10, color: '#4A5568' },
  noFaceChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(255,61,113,0.15)', borderWidth: 1, borderColor: '#FF3D7133' },
  noFaceText: { fontSize: 9, color: '#FF3D71', fontWeight: '700' },
  chevron: { fontSize: 22, color: '#4A5568', marginLeft: 4 },

  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: '#4A5568', fontSize: 14 },

  footer: { alignItems: 'center', marginTop: 16 },
  footerText: { fontSize: 11, color: '#1E2840', fontWeight: '600' },
});

const d = StyleSheet.create({
  modal: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 99, justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0D1530', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: BORDER,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  modalAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  modalAvatarText: { fontSize: 22, fontWeight: '900' },
  modalInfo: { flex: 1 },
  modalName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  modalDesig: { fontSize: 12, color: '#718096', marginTop: 2 },
  modalDept: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: '#718096', fontSize: 14 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  detailKey: { fontSize: 13, color: '#4A5568' },
  detailVal: { fontSize: 13, color: '#fff', fontWeight: '600' },
  timeRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  timeBox: {
    flex: 1, padding: 10, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10, borderWidth: 1, borderColor: BORDER,
  },
  timeLabel: { fontSize: 8, color: '#4A5568', fontWeight: '700', letterSpacing: 0.8 },
  timeVal: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 3 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  viewDashBtn: { flex: 1, backgroundColor: '#0062FF', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  viewDashBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  closeModalBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  closeModalBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
