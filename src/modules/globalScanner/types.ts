import { Product } from '@/types/stock';

export interface BatchQueueItem {
  id: string;
  barcode: string;
  product?: Product;
  quantity: number;
  found: boolean;
}

export type BatchActionType = 'giris' | 'cikis' | 'transfer';

export interface GlobalScannerState {
  scannerOpen: boolean;
  batchMode: boolean;
  batchQueue: BatchQueueItem[];
  copilotProduct: Product | null;
  copilotOpen: boolean;
  quickCreateOpen: boolean;
  quickCreateBarcode: string;
}

export interface GlobalScannerContextType extends GlobalScannerState {
  openScanner: (batchMode?: boolean) => void;
  closeScanner: () => void;
  toggleBatchMode: () => void;
  addToQueue: (item: Omit<BatchQueueItem, 'id'>) => void;
  updateQueueQuantity: (id: string, quantity: number) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  openCopilot: (product: Product) => void;
  closeCopilot: () => void;
  openQuickCreate: (barcode: string) => void;
  closeQuickCreate: () => void;
}
