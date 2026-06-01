import Dexie, { Table } from 'dexie';
import type { FaceEmbedding, AuthAttempt } from '@/types';

export class FaceAuthDatabase extends Dexie {
  embeddings!: Table<FaceEmbedding>;
  authAttempts!: Table<AuthAttempt>;

  constructor() {
    super('FaceAuthOfflineDB');
    this.version(1).stores({
      embeddings: '++id, userId, enrolledAt',
      authAttempts: '++id, userId, timestamp, synced',
    });
  }
}

export const db = new FaceAuthDatabase();

// Embedding operations
export async function saveEmbedding(embedding: FaceEmbedding): Promise<void> {
  await db.embeddings.put(embedding);
}

export async function getAllEmbeddings(): Promise<FaceEmbedding[]> {
  return await db.embeddings.toArray();
}

export async function deleteEmbedding(userId: string): Promise<void> {
  await db.embeddings.where('userId').equals(userId).delete();
}

// Auth attempt operations
export async function saveAuthAttempt(attempt: AuthAttempt): Promise<void> {
  await db.authAttempts.add(attempt);
}

export async function getUnsyncedAttempts(limit: number = 50): Promise<AuthAttempt[]> {
  return await db.authAttempts
    .where('synced')
    .equals(false)
    .limit(limit)
    .toArray();
}

export async function markAttemptsSynced(ids: string[]): Promise<void> {
  await db.authAttempts.bulkUpdate(
    ids.map(id => ({ key: id, changes: { synced: true } }))
  );
}

export async function getAuthHistory(limit: number = 50): Promise<AuthAttempt[]> {
  return await db.authAttempts
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray();
}

export async function purgeLocalSyncedAttempts(): Promise<number> {
  const count = await db.authAttempts.where('synced').equals(true).count();
  await db.authAttempts.where('synced').equals(true).delete();
  return count;
}

export async function getAuthAttemptCount(userId?: string): Promise<number> {
  if (userId) {
    return await db.authAttempts.where('userId').equals(userId).count();
  }
  return await db.authAttempts.count();
}

export async function getSuccessfulAuthCount(userId?: string): Promise<number> {
  if (userId) {
    return await db.authAttempts
      .where('userId')
      .equals(userId)
      .and(a => a.result === 'SUCCESS')
      .count();
  }
  return await db.authAttempts.where('result').equals('SUCCESS').count();
}
