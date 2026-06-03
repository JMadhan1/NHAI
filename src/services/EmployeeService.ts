import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Employee, AttendanceRecord, LeaveBalance, LeaveRequest, Holiday,
} from '../types/employee';

const KEYS = {
  EMPLOYEES: 'visorai_employees_v1',
  ATTENDANCE: 'visorai_attendance_v1',
  LEAVES: 'visorai_leaves_v1',
  LEAVE_REQUESTS: 'visorai_leave_requests_v1',
};

const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'e1', employeeId: 'EMP-001', name: 'Rajesh Kumar',
    designation: 'Shift Supervisor', department: 'Operations',
    shift: 'MORNING', shiftStart: '06:00', shiftEnd: '14:00',
    joinDate: '2021-03-15', phone: '9876543210', enrolledFace: true, active: true,
  },
  {
    id: 'e2', employeeId: 'EMP-002', name: 'Priya Sharma',
    designation: 'Data Entry Operator', department: 'Administration',
    shift: 'MORNING', shiftStart: '09:00', shiftEnd: '17:00',
    joinDate: '2022-07-01', phone: '9876543211', enrolledFace: true, active: true,
  },
  {
    id: 'e3', employeeId: 'EMP-003', name: 'Suresh Patel',
    designation: 'Field Officer', department: 'Field Services',
    shift: 'AFTERNOON', shiftStart: '14:00', shiftEnd: '22:00',
    joinDate: '2020-11-20', phone: '9876543212', enrolledFace: false, active: true,
  },
  {
    id: 'e4', employeeId: 'EMP-004', name: 'Anita Singh',
    designation: 'System Analyst', department: 'IT Support',
    shift: 'MORNING', shiftStart: '09:00', shiftEnd: '17:00',
    joinDate: '2023-01-10', phone: '9876543213', enrolledFace: true, active: true,
  },
  {
    id: 'e5', employeeId: 'EMP-005', name: 'Mohammed Ali',
    designation: 'Network Engineer', department: 'IT Support',
    shift: 'AFTERNOON', shiftStart: '14:00', shiftEnd: '22:00',
    joinDate: '2021-09-05', phone: '9876543214', enrolledFace: true, active: true,
  },
  {
    id: 'e6', employeeId: 'EMP-006', name: 'Kavitha Rajan',
    designation: 'Security Officer', department: 'Security',
    shift: 'NIGHT', shiftStart: '22:00', shiftEnd: '06:00',
    joinDate: '2022-04-18', phone: '9876543215', enrolledFace: true, active: true,
  },
  {
    id: 'e7', employeeId: 'EMP-007', name: 'Deepak Verma',
    designation: 'Operations Executive', department: 'Operations',
    shift: 'MORNING', shiftStart: '06:00', shiftEnd: '14:00',
    joinDate: '2023-06-01', phone: '9876543216', enrolledFace: false, active: true,
  },
  {
    id: 'e8', employeeId: 'EMP-008', name: 'Sunita Reddy',
    designation: 'Administrative Officer', department: 'Administration',
    shift: 'MORNING', shiftStart: '09:00', shiftEnd: '17:00',
    joinDate: '2020-08-12', phone: '9876543217', enrolledFace: true, active: true,
  },
];

const SEED_LEAVES: LeaveBalance[] = SEED_EMPLOYEES.map(e => ({
  employeeId: e.employeeId,
  annual: { total: 20, used: Math.floor(Math.random() * 8) },
  sick: { total: 10, used: Math.floor(Math.random() * 4) },
  casual: { total: 8, used: Math.floor(Math.random() * 3) },
}));

export const HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-01', name: "New Year's Day", type: 'NATIONAL' },
  { date: '2026-01-26', name: 'Republic Day', type: 'NATIONAL' },
  { date: '2026-03-14', name: 'Holi', type: 'NATIONAL' },
  { date: '2026-03-31', name: 'Eid ul-Fitr', type: 'NATIONAL' },
  { date: '2026-04-03', name: 'Good Friday', type: 'NATIONAL' },
  { date: '2026-04-14', name: 'Ambedkar Jayanti', type: 'NATIONAL' },
  { date: '2026-05-01', name: 'Labour Day', type: 'NATIONAL' },
  { date: '2026-08-15', name: 'Independence Day', type: 'NATIONAL' },
  { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'NATIONAL' },
  { date: '2026-10-21', name: 'Diwali', type: 'NATIONAL' },
  { date: '2026-11-15', name: "Guru Nanak's Birthday", type: 'NATIONAL' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'NATIONAL' },
];

async function seed() {
  const existing = await AsyncStorage.getItem(KEYS.EMPLOYEES);
  if (!existing) {
    await AsyncStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(SEED_EMPLOYEES));
    await AsyncStorage.setItem(KEYS.LEAVES, JSON.stringify(SEED_LEAVES));
    await seedAttendance();
  }
}

async function seedAttendance() {
  const records: AttendanceRecord[] = [];
  const now = new Date();
  SEED_EMPLOYEES.forEach(emp => {
    for (let d = 25; d >= 1; d--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
      const dow = date.getDay();
      const dateStr = date.toISOString().split('T')[0];
      if (dow === 0 || dow === 6) {
        records.push({ id: `${emp.id}_${dateStr}`, employeeId: emp.employeeId, date: dateStr, status: 'HOLIDAY' });
      } else {
        const rand = Math.random();
        if (rand < 0.85) {
          const [sh, sm] = emp.shiftStart.split(':').map(Number);
          const delay = Math.floor(Math.random() * 20);
          const ci = `${String(sh).padStart(2, '0')}:${String(sm + delay).padStart(2, '0')}`;
          const co = `${String(sh + 8).padStart(2, '0')}:${String(sm + delay).padStart(2, '0')}`;
          records.push({ id: `${emp.id}_${dateStr}`, employeeId: emp.employeeId, date: dateStr, checkIn: ci, checkOut: co, status: 'PRESENT', hoursWorked: 8 });
        } else if (rand < 0.93) {
          records.push({ id: `${emp.id}_${dateStr}`, employeeId: emp.employeeId, date: dateStr, status: 'ABSENT' });
        } else {
          records.push({ id: `${emp.id}_${dateStr}`, employeeId: emp.employeeId, date: dateStr, status: 'LEAVE' });
        }
      }
    }
    const todayStr = now.toISOString().split('T')[0];
    const dow = now.getDay();
    if (dow !== 0 && dow !== 6) {
      const [sh, sm] = emp.shiftStart.split(':').map(Number);
      const nowH = now.getHours();
      if (nowH >= sh) {
        records.push({
          id: `${emp.id}_${todayStr}`, employeeId: emp.employeeId, date: todayStr,
          checkIn: `${String(sh).padStart(2, '0')}:${String(sm + 3).padStart(2, '0')}`,
          status: 'PRESENT',
        });
      }
    }
  });
  await AsyncStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(records));
}

export async function getAllEmployees(): Promise<Employee[]> {
  await seed();
  const raw = await AsyncStorage.getItem(KEYS.EMPLOYEES);
  return raw ? JSON.parse(raw) : [];
}

export async function addEmployee(emp: Employee): Promise<void> {
  const all = await getAllEmployees();
  all.push(emp);
  await AsyncStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(all));
  const leaves = await getAllLeaveBalances();
  leaves.push({ employeeId: emp.employeeId, annual: { total: 20, used: 0 }, sick: { total: 10, used: 0 }, casual: { total: 8, used: 0 } });
  await AsyncStorage.setItem(KEYS.LEAVES, JSON.stringify(leaves));
}

export async function getEmployeeById(employeeId: string): Promise<Employee | null> {
  const all = await getAllEmployees();
  return all.find(e => e.employeeId === employeeId) ?? null;
}

export async function getAttendanceForEmployee(employeeId: string): Promise<AttendanceRecord[]> {
  const raw = await AsyncStorage.getItem(KEYS.ATTENDANCE);
  const all: AttendanceRecord[] = raw ? JSON.parse(raw) : [];
  return all.filter(r => r.employeeId === employeeId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getTodayAttendanceAll(): Promise<AttendanceRecord[]> {
  const today = new Date().toISOString().split('T')[0];
  const raw = await AsyncStorage.getItem(KEYS.ATTENDANCE);
  const all: AttendanceRecord[] = raw ? JSON.parse(raw) : [];
  return all.filter(r => r.date === today);
}

export async function checkIn(employeeId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const raw = await AsyncStorage.getItem(KEYS.ATTENDANCE);
  const all: AttendanceRecord[] = raw ? JSON.parse(raw) : [];
  const existing = all.find(r => r.employeeId === employeeId && r.date === today);
  if (existing) {
    existing.checkIn = time;
    existing.status = 'PRESENT';
  } else {
    all.push({ id: `${employeeId}_${today}`, employeeId, date: today, checkIn: time, status: 'PRESENT' });
  }
  await AsyncStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(all));
}

export async function checkOut(employeeId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const raw = await AsyncStorage.getItem(KEYS.ATTENDANCE);
  const all: AttendanceRecord[] = raw ? JSON.parse(raw) : [];
  const record = all.find(r => r.employeeId === employeeId && r.date === today);
  if (record?.checkIn) {
    record.checkOut = time;
    const [ih, im] = record.checkIn.split(':').map(Number);
    const [oh, om] = time.split(':').map(Number);
    record.hoursWorked = parseFloat(((oh * 60 + om - ih * 60 - im) / 60).toFixed(1));
  }
  await AsyncStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(all));
}

export async function getAllLeaveBalances(): Promise<LeaveBalance[]> {
  const raw = await AsyncStorage.getItem(KEYS.LEAVES);
  return raw ? JSON.parse(raw) : [];
}

export async function getLeaveBalance(employeeId: string): Promise<LeaveBalance> {
  const all = await getAllLeaveBalances();
  return (
    all.find(l => l.employeeId === employeeId) ?? {
      employeeId,
      annual: { total: 20, used: 0 },
      sick: { total: 10, used: 0 },
      casual: { total: 8, used: 0 },
    }
  );
}

export async function getMonthlyStats(employeeId: string): Promise<{
  present: number; absent: number; leaves: number; holidays: number; totalDays: number;
}> {
  const records = await getAttendanceForEmployee(employeeId);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthly = records.filter(r => r.date.startsWith(thisMonth));
  return {
    present: monthly.filter(r => r.status === 'PRESENT').length,
    absent: monthly.filter(r => r.status === 'ABSENT').length,
    leaves: monthly.filter(r => r.status === 'LEAVE').length,
    holidays: monthly.filter(r => r.status === 'HOLIDAY').length,
    totalDays: monthly.length,
  };
}

export function getUpcomingHolidays(count = 5): Holiday[] {
  const today = new Date().toISOString().split('T')[0];
  return HOLIDAYS_2026.filter(h => h.date >= today).slice(0, count);
}
