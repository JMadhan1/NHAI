import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db: SQLite.SQLiteDatabase | null = null;

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;          // YYYY-MM-DD
  checkIn: string;       // HH:MM:SS
  checkOut?: string;      // HH:MM:SS
  checkInTimestamp: number;
  checkOutTimestamp?: number;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HALF_DAY';
  workHours: number;      // calculated hours
  location?: string;
  notes?: string;
}

export async function setAttendanceDb(database: SQLite.SQLiteDatabase): Promise<void> {
  db = database;
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      check_in_timestamp INTEGER,
      check_out_timestamp INTEGER,
      status TEXT NOT NULL DEFAULT 'PRESENT',
      work_hours REAL DEFAULT 0,
      location TEXT,
      notes TEXT,
      UNIQUE(user_id, date)
    );
  `);
  await db.executeSql(`CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);`);
  await db.executeSql(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);`);
}

function generateId(): string {
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 9);
  return `${ts}-${r}`;
}

export async function checkIn(
  userId: string,
  location?: string
): Promise<AttendanceRecord> {
  if (!db) throw new Error('Database not initialized');
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const checkInTime = now.toTimeString().split(' ')[0];

  const record: AttendanceRecord = {
    id: generateId(),
    userId,
    date,
    checkIn: checkInTime,
    checkInTimestamp: now.getTime(),
    status: 'PRESENT',
    workHours: 0,
    location,
  };

  await db.executeSql(
    `INSERT OR REPLACE INTO attendance
     (id, user_id, date, check_in, check_out, check_in_timestamp, check_out_timestamp, status, work_hours, location)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [record.id, userId, date, checkInTime, null, now.getTime(), null, 'PRESENT', 0, location || null]
  );

  return record;
}

export async function checkOut(
  userId: string,
  notes?: string
): Promise<AttendanceRecord | null> {
  if (!db) throw new Error('Database not initialized');
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const checkOutTime = now.toTimeString().split(' ')[0];

  // Find today's record
  const [result] = await db.executeSql(
    'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
    [userId, date]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows.item(0);
  const checkInTs = row.check_in_timestamp;
  const workHours = checkInTs ? (now.getTime() - checkInTs) / (1000 * 60 * 60) : 0;

  await db.executeSql(
    `UPDATE attendance SET check_out = ?, check_out_timestamp = ?, work_hours = ?, notes = ?
     WHERE user_id = ? AND date = ?`,
    [checkOutTime, now.getTime(), workHours, notes || null, userId, date]
  );

  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    checkIn: row.check_in,
    checkOut: checkOutTime,
    checkInTimestamp: checkInTs,
    checkOutTimestamp: now.getTime(),
    status: row.status,
    workHours,
    location: row.location,
    notes: notes || row.notes,
  };
}

export async function getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
  if (!db) return null;
  const date = new Date().toISOString().split('T')[0];
  const [result] = await db.executeSql(
    'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
    [userId, date]
  );
  if (result.rows.length === 0) return null;
  return rowToRecord(result.rows.item(0));
}

export async function getAttendanceHistory(
  userId: string,
  limit = 30
): Promise<AttendanceRecord[]> {
  if (!db) return [];
  const [result] = await db.executeSql(
    'SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT ?',
    [userId, limit]
  );
  const records: AttendanceRecord[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    records.push(rowToRecord(result.rows.item(i)));
  }
  return records;
}

export async function getAttendanceForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<AttendanceRecord[]> {
  if (!db) return [];
  const [result] = await db.executeSql(
    'SELECT * FROM attendance WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date DESC',
    [userId, startDate, endDate]
  );
  const records: AttendanceRecord[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    records.push(rowToRecord(result.rows.item(i)));
  }
  return records;
}

export async function getMonthlyStats(userId: string, yearMonth: string): Promise<{
  present: number;
  absent: number;
  leave: number;
  halfDay: number;
  totalHours: number;
}> {
  if (!db) return { present: 0, absent: 0, leave: 0, halfDay: 0, totalHours: 0 };
  const [result] = await db.executeSql(
    `SELECT status, COUNT(*) as count, SUM(work_hours) as total_hours
     FROM attendance WHERE user_id = ? AND date LIKE ? GROUP BY status`,
    [userId, `${yearMonth}%`]
  );

  const stats = { present: 0, absent: 0, leave: 0, halfDay: 0, totalHours: 0 };
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const status = row.status as string;
    const count = row.count as number;
    const hours = row.total_hours || 0;
    if (status === 'PRESENT') stats.present = count;
    else if (status === 'ABSENT') stats.absent = count;
    else if (status === 'LEAVE') stats.leave = count;
    else if (status === 'HALF_DAY') stats.halfDay = count;
    stats.totalHours += hours;
  }
  return stats;
}

function rowToRecord(row: any): AttendanceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    checkIn: row.check_in,
    checkOut: row.check_out,
    checkInTimestamp: row.check_in_timestamp,
    checkOutTimestamp: row.check_out_timestamp,
    status: row.status,
    workHours: row.work_hours || 0,
    location: row.location,
    notes: row.notes,
  };
}

export async function hasCheckedInToday(userId: string): Promise<boolean> {
  const today = await getTodayAttendance(userId);
  return !!today && !!today.checkIn;
}

export async function hasCheckedOutToday(userId: string): Promise<boolean> {
  const today = await getTodayAttendance(userId);
  return !!today && !!today.checkOut;
}

export async function getStreak(userId: string): Promise<number> {
  if (!db) return 0;
  const history = await getAttendanceHistory(userId, 60);
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  for (const record of history) {
    if (record.status === 'PRESENT' || record.status === 'HALF_DAY') {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
