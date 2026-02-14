import { getOfflineQueue, SyncAction } from '@/lib/offlineSync';

export interface SyncStatusInfo {
  isOnline: boolean;
  pendingCount: number;
  pendingActions: SyncAction[];
}

export function getSyncStatus(): SyncStatusInfo {
  return {
    isOnline: navigator.onLine,
    pendingCount: getOfflineQueue().length,
    pendingActions: getOfflineQueue(),
  };
}
