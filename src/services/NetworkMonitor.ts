import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  connectionStrength?: number;
}

let listeners: Array<(status: NetworkStatus) => void> = [];
let currentStatus: NetworkStatus = {
  isOnline: false,
  isConnected: false,
  isInternetReachable: false,
  type: 'unknown',
};

export function initNetworkMonitor(): () => void {
  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    currentStatus = {
      isOnline: state.isConnected === true && state.isInternetReachable === true,
      isConnected: state.isConnected === true,
      isInternetReachable: state.isInternetReachable === true,
      type: state.type || 'unknown',
    };

    listeners.forEach(listener => {
      try {
        listener(currentStatus);
      } catch (err) {
        console.error('Error in network listener:', err);
      }
    });
  });

  return unsubscribe;
}

export function subscribeToNetworkStatus(callback: (status: NetworkStatus) => void): () => void {
  listeners.push(callback);
  callback(currentStatus);

  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  const state = await NetInfo.fetch();
  return {
    isOnline: state.isConnected === true && state.isInternetReachable === true,
    isConnected: state.isConnected === true,
    isInternetReachable: state.isInternetReachable === true,
    type: state.type || 'unknown',
  };
}

export function getCurrentNetworkStatus(): NetworkStatus {
  return currentStatus;
}
