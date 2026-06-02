import Dexie, { Table } from 'dexie';
import type { FaceEmbedding, AuthAttempt } from '@/types';

export class FaceAuthDatabase extends Dexie {
  embeddings!: Table<FaceEmbedding>;
  authAttempts!: Table<AuthAttempt>;

  constructor() {
    super('FaceAuthOfflineDB');
    this.version(1).stores({
      embeddings: 'id, userId, enrolledAt',
      authAttempts: 'id, userId, timestamp, synced',
    });
  }
}

export const db = new FaceAuthDatabase();

// Helper to generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Embedding operations
export async function saveEmbedding(embedding: FaceEmbedding): Promise<void> {
  const embeddingToSave = {
    ...embedding,
    id: embedding.id || generateId(),
  };
  await db.embeddings.put(embeddingToSave);
}

export async function getAllEmbeddings(): Promise<FaceEmbedding[]> {
  return await db.embeddings.toArray();
}

export async function deleteEmbedding(userId: string): Promise<void> {
  await db.embeddings.where('userId').equals(userId).delete();
}

// Auth attempt operations
export async function saveAuthAttempt(attempt: AuthAttempt): Promise<void> {
  const attemptToSave = {
    ...attempt,
    id: attempt.id || generateId(),
  };
  await db.authAttempts.put(attemptToSave);
}

export async function getUnsyncedAttempts(limit: number = 50): Promise<AuthAttempt[]> {
  return await db.authAttempts
    .where('synced')
    .equals(false)
    .limit(limit)
    .toArray();
}

export async function markAttemptsSynced(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map(id =>
      db.authAttempts.update(id, { synced: true })
    )
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
  const syncedAttempts = await db.authAttempts.where('synced').equals(true).toArray();
  await db.authAttempts.bulkDelete(syncedAttempts.map(a => a.id));
  return syncedAttempts.length;
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
