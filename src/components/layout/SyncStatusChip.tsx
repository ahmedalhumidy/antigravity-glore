import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function SyncStatusChip() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { pendingActions, syncing, syncAll, hasPendingActions } = useOfflineSync();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={hasPendingActions && isOnline ? syncAll : undefined}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all',
            'border',
            isOnline
              ? hasPendingActions
                ? 'border-warning/50 bg-warning/10 text-warning hover:bg-warning/20 cursor-pointer'
                : 'border-success/30 bg-success/10 text-success'
              : 'border-destructive/50 bg-destructive/10 text-destructive'
          )}
        >
          {syncing ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : isOnline ? (
            hasPendingActions ? (
              <CloudOff className="w-3 h-3" />
            ) : (
              <Cloud className="w-3 h-3" />
            )
          ) : (
            <WifiOff className="w-3 h-3" />
          )}

          {!isOnline ? (
            <span className="hidden sm:inline">Çevrimdışı</span>
          ) : syncing ? (
            <span className="hidden sm:inline">Senkronize...</span>
          ) : hasPendingActions ? (
            <span className="hidden sm:inline">{pendingActions.length}</span>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {!isOnline ? (
          <p>Çevrimdışı — İnternet bağlantısı yok</p>
        ) : syncing ? (
          <p>Senkronize ediliyor...</p>
        ) : hasPendingActions ? (
          <p>{pendingActions.length} bekleyen işlem — Tıklayın senkronize edin</p>
        ) : (
          <p>Çevrimiçi ✓</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
