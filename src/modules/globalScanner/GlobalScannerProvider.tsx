import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Product } from '@/types/stock';
import { GlobalScannerContextType, GlobalScannerState, BatchQueueItem } from './types';

const initialState: GlobalScannerState = {
  scannerOpen: false,
  batchMode: false,
  batchQueue: [],
  copilotProduct: null,
  copilotOpen: false,
  quickCreateOpen: false,
  quickCreateBarcode: '',
};

const GlobalScannerContext = createContext<GlobalScannerContextType | null>(null);

export function useGlobalScanner() {
  const ctx = useContext(GlobalScannerContext);
  if (!ctx) throw new Error('useGlobalScanner must be used within GlobalScannerProvider');
  return ctx;
}

export function GlobalScannerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GlobalScannerState>(initialState);

  const openScanner = useCallback((batchMode = false) => {
    setState(s => ({ ...s, scannerOpen: true, batchMode }));
  }, []);

  const closeScanner = useCallback(() => {
    setState(s => ({ ...s, scannerOpen: false }));
  }, []);

  const toggleBatchMode = useCallback(() => {
    setState(s => ({ ...s, batchMode: !s.batchMode }));
  }, []);

  const addToQueue = useCallback((item: Omit<BatchQueueItem, 'id'>) => {
    setState(s => {
      // If barcode already in queue, increment quantity
      const existing = s.batchQueue.find(q => q.barcode === item.barcode);
      if (existing) {
        return {
          ...s,
          batchQueue: s.batchQueue.map(q =>
            q.barcode === item.barcode ? { ...q, quantity: q.quantity + 1 } : q
          ),
        };
      }
      return {
        ...s,
        batchQueue: [...s.batchQueue, { ...item, id: crypto.randomUUID() }],
      };
    });
  }, []);

  const updateQueueQuantity = useCallback((id: string, quantity: number) => {
    setState(s => ({
      ...s,
      batchQueue: s.batchQueue.map(q =>
        q.id === id ? { ...q, quantity: Math.max(1, quantity) } : q
      ),
    }));
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setState(s => ({ ...s, batchQueue: s.batchQueue.filter(q => q.id !== id) }));
  }, []);

  const clearQueue = useCallback(() => {
    setState(s => ({ ...s, batchQueue: [] }));
  }, []);

  const openCopilot = useCallback((product: Product) => {
    setState(s => ({ ...s, copilotProduct: product, copilotOpen: true }));
  }, []);

  const closeCopilot = useCallback(() => {
    setState(s => ({ ...s, copilotProduct: null, copilotOpen: false }));
  }, []);

  const openQuickCreate = useCallback((barcode: string) => {
    setState(s => ({ ...s, quickCreateOpen: true, quickCreateBarcode: barcode }));
  }, []);

  const closeQuickCreate = useCallback(() => {
    setState(s => ({ ...s, quickCreateOpen: false, quickCreateBarcode: '' }));
  }, []);

  const value: GlobalScannerContextType = {
    ...state,
    openScanner,
    closeScanner,
    toggleBatchMode,
    addToQueue,
    updateQueueQuantity,
    removeFromQueue,
    clearQueue,
    openCopilot,
    closeCopilot,
    openQuickCreate,
    closeQuickCreate,
  };

  return (
    <GlobalScannerContext.Provider value={value}>
      {children}
    </GlobalScannerContext.Provider>
  );
}
