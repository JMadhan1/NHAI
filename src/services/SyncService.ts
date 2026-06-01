import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { getUnsyncedAttempts, markAttemptsSynced, purgeLocalSyncedAttempts } from './StorageService';
import { CONSTANTS } from '../utils/constants';

let syncInProgress = false;

export function startNetworkWatcher(onStatusChange: (isOnline: boolean) => void): () => void {
  const unsubscribe = NetInfo.addEventListener(state => {
    const isOnline = state.isConnected === true && state.isInternetReachable === true;
    onStatusChange(isOnline);
    if (isOnline && !syncInProgress) {
      triggerSync();
    }
  });
  return unsubscribe;
}

export async function triggerSync(): Promise<{ uploaded: number; purged: number; errors: string[] }> {
  if (syncInProgress) return { uploaded: 0, purged: 0, errors: ['Sync already in progress'] };
  syncInProgress = true;
  const errors: string[] = [];
  let uploaded = 0;
  let purged = 0;

  try {
    const attempts = await getUnsyncedAttempts();
    if (attempts.length === 0) {
      return { uploaded: 0, purged: 0, errors: [] };
    }

    const response = await axios.post(
      `${CONSTANTS.AWS_API_ENDPOINT}/sync/auth-attempts`,
      { attempts, deviceTimestamp: Date.now() },
      {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json', 'X-Device-Platform': 'react-native' },
        validateStatus: (status) => status === 200,
      }
    );

    if (response.data.accepted && Array.isArray(response.data.accepted)) {
      const acceptedIds: string[] = response.data.accepted;
      await markAttemptsSynced(acceptedIds);
      uploaded = acceptedIds.length;
      purged = await purgeLocalSyncedAttempts();
    }
  } catch (err: any) {
    errors.push(err.message || 'Unknown sync error');
  } finally {
    syncInProgress = false;
  }

  return { uploaded, purged, errors };
}

export async function manualSync(): Promise<{ uploaded: number; purged: number; errors: string[] }> {
  const state = await NetInfo.fetch();
  if (!state.isConnected || !state.isInternetReachable) {
    return { uploaded: 0, purged: 0, errors: ['No network connection available'] };
  }
  return triggerSync();
}

export async function getSyncStatus(): Promise<{ pendingCount: number; isOnline: boolean }> {
  const state = await NetInfo.fetch();
  const pending = await getUnsyncedAttempts();
  return {
    pendingCount: pending.length,
    isOnline: state.isConnected === true && state.isInternetReachable === true,
  };
}

export function isSyncInProgress(): boolean {
  return syncInProgress;
}
