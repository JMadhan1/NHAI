import SQLite from 'react-native-sqlite-storage';
import * as Keychain from 'react-native-keychain';
import type { FaceEmbedding, AuthAttempt, SyncQueueItem } from '../types';
import { CONSTANTS } from '../utils/constants';
import { setAttendanceDb } from './AttendanceService';

SQLite.enablePromise(true);

let db: SQLite.SQLiteDatabase | null = null;

async function getOrCreateEncryptionKey(): Promise<string> {
  const existing = await Keychain.getGenericPassword({ service: CONSTANTS.KEYCHAIN_SERVICE });
  if (existing && existing.password) return existing.password;
  const key = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('');
  await Keychain.setGenericPassword('faceauth', key, {
    service: CONSTANTS.KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

export async function initDatabase(): Promise<void> {
  const encKey = await getOrCreateEncryptionKey();
  db = await SQLite.openDatabase({
    name: CONSTANTS.DB_NAME,
    key: encKey,
    location: 'default',
  });

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS face_embeddings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      vector TEXT NOT NULL,
      enrolled_at INTEGER NOT NULL,
      enrolled_gps TEXT,
      UNIQUE(user_id)
    );
  `);

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS auth_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      timestamp INTEGER NOT NULL,
      result TEXT NOT NULL,
      confidence REAL NOT NULL,
      liveness_score REAL NOT NULL,
      gps TEXT,
      device_id TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      retry_count INTEGER DEFAULT 0
    );
  `);

  await db.executeSql(`CREATE INDEX IF NOT EXISTS idx_auth_synced ON auth_attempts(synced);`);
  await db.executeSql(`CREATE INDEX IF NOT EXISTS idx_auth_timestamp ON auth_attempts(timestamp);`);
  await db.executeSql(`CREATE INDEX IF NOT EXISTS idx_queue_created ON sync_queue(created_at);`);

  // Initialize attendance tables
  await setAttendanceDb(db);
}

export async function saveEmbedding(embedding: FaceEmbedding): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql(
    `INSERT OR REPLACE INTO face_embeddings (id, user_id, user_name, vector, enrolled_at, enrolled_gps)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      embedding.id,
      embedding.userId,
      embedding.userName,
      JSON.stringify(embedding.vector),
      embedding.enrolledAt,
      embedding.enrolledGps ? JSON.stringify(embedding.enrolledGps) : null,
    ]
  );
}

export async function getAllEmbeddings(): Promise<FaceEmbedding[]> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql('SELECT * FROM face_embeddings ORDER BY enrolled_at DESC');
  const embeddings: FaceEmbedding[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    embeddings.push({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      vector: JSON.parse(row.vector),
      enrolledAt: row.enrolled_at,
      enrolledGps: row.enrolled_gps ? JSON.parse(row.enrolled_gps) : undefined,
    });
  }
  return embeddings;
}

export async function getUserCount(): Promise<number> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql('SELECT COUNT(*) as count FROM face_embeddings');
  return result.rows.item(0).count;
}

export async function deleteEmbedding(userId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql('DELETE FROM face_embeddings WHERE user_id = ?', [userId]);
}

export async function saveAuthAttempt(attempt: AuthAttempt): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql(
    `INSERT INTO auth_attempts (id, user_id, timestamp, result, confidence, liveness_score, gps, device_id, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      attempt.id,
      attempt.userId,
      attempt.timestamp,
      attempt.result,
      attempt.confidence,
      attempt.livenessScore,
      attempt.gps ? JSON.stringify(attempt.gps) : null,
      attempt.deviceId,
      attempt.synced ? 1 : 0,
    ]
  );
}

export async function getUnsyncedAttempts(): Promise<AuthAttempt[]> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql(
    'SELECT * FROM auth_attempts WHERE synced = 0 ORDER BY timestamp ASC LIMIT ?',
    [CONSTANTS.SYNC_BATCH_SIZE]
  );
  const attempts: AuthAttempt[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    attempts.push({
      id: row.id,
      userId: row.user_id,
      timestamp: row.timestamp,
      result: row.result,
      confidence: row.confidence,
      livenessScore: row.liveness_score,
      gps: row.gps ? JSON.parse(row.gps) : undefined,
      deviceId: row.device_id,
      synced: row.synced === 1,
    });
  }
  return attempts;
}

export async function getPendingCount(): Promise<number> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql(
    'SELECT COUNT(*) as count FROM auth_attempts WHERE synced = 0'
  );
  return result.rows.item(0).count;
}

export async function markAttemptsSynced(ids: string[]): Promise<void> {
  if (!db || ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.executeSql(`UPDATE auth_attempts SET synced = 1 WHERE id IN (${placeholders})`, ids);
}

export async function purgeLocalSyncedAttempts(): Promise<number> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql('DELETE FROM auth_attempts WHERE synced = 1');
  return result.rowsAffected;
}

export async function getAuthHistory(limit = 50): Promise<AuthAttempt[]> {
  if (!db) throw new Error('Database not initialized');
  const [result] = await db.executeSql(
    'SELECT * FROM auth_attempts ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
  const attempts: AuthAttempt[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    attempts.push({
      id: row.id,
      userId: row.user_id,
      timestamp: row.timestamp,
      result: row.result,
      confidence: row.confidence,
      livenessScore: row.liveness_score,
      gps: row.gps ? JSON.parse(row.gps) : undefined,
      deviceId: row.device_id,
      synced: row.synced === 1,
    });
  }
  return attempts;
}

export async function getAuthAttemptCount(userId?: string): Promise<number> {
  if (!db) throw new Error('Database not initialized');
  const query = userId
    ? 'SELECT COUNT(*) as count FROM auth_attempts WHERE user_id = ?'
    : 'SELECT COUNT(*) as count FROM auth_attempts';
  const [result] = await db.executeSql(query, userId ? [userId] : []);
  return result.rows.item(0).count;
}

export async function getSuccessfulAuthCount(userId?: string): Promise<number> {
  if (!db) throw new Error('Database not initialized');
  const query = userId
    ? "SELECT COUNT(*) as count FROM auth_attempts WHERE user_id = ? AND result = 'SUCCESS'"
    : "SELECT COUNT(*) as count FROM auth_attempts WHERE result = 'SUCCESS'";
  const [result] = await db.executeSql(query, userId ? [userId] : []);
  return result.rows.item(0).count;
}

export async function clearAllData(): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql('DELETE FROM auth_attempts');
  await db.executeSql('DELETE FROM face_embeddings');
  await db.executeSql('DELETE FROM sync_queue');
}

export async function clearAuthHistory(): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.executeSql('DELETE FROM auth_attempts');
}
