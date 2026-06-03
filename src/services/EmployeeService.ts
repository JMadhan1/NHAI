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

// No dummy/seed data - only real enrolled employees
// All employees added through actual enrollment process

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

// No seed/mock data initialization - all data is real from actual user enrollment
async function seed() {
  // Initialize empty collections if they don't exist
  const existingEmployees = await AsyncStorage.getItem(KEYS.EMPLOYEES);
  if (!existingEmployees) {
    await AsyncStorage.setItem(KEYS.EMPLOYEES, JSON.stringify([]));
  }
  const existingAttendance = await AsyncStorage.getItem(KEYS.ATTENDANCE);
  if (!existingAttendance) {
    await AsyncStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
  }
  const existingLeaves = await AsyncStorage.getItem(KEYS.LEAVES);
  if (!existingLeaves) {
    await AsyncStorage.setItem(KEYS.LEAVES, JSON.stringify([]));
  }
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
