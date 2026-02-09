import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import {
  X, Camera, Undo2, Trash2, CheckCircle2, ScanBarcode,
  MapPin, ArrowRightLeft, Keyboard, Package, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types/stock';
import { ScanSessionMode } from '../types';
import { useScanSession } from '../hooks/useScanSession';
import { useHardwareScanner } from '../hooks/useHardwareScanner';
import { ScanSessionHeader } from './ScanSessionHeader';
import { ScanSessionQueue } from './ScanSessionQueue';
import { ScanSessionShelfPicker } from './ScanSessionShelfPicker';
import { ScanSessionQuickAdd } from './ScanSessionQuickAdd';
import { ScanSessionSummary } from './ScanSessionSummary';
import { cn } from '@/lib/utils';

const LazyBarcodeScanner = lazy(() =>
  import('@/components/scanner/BarcodeScanner').then(m => ({ default: m.BarcodeScanner }))
);

interface ScanSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialMode: ScanSessionMode;
  prefillProduct?: Product;
  onStockUpdated?: () => void;
}

export function ScanSessionModal({
  isOpen,
  onClose,
  products,
  initialMode,
  prefillProduct,
  onStockUpdated,
}: ScanSessionModalProps) {
  const {
    session,
    isProcessing,
    settings,
    startSession,
    endSession,
    handleScan,
    setScanTarget,
    setInputMethod,
    setActiveShelf,
    setTransferStep,
    updateQueueItem,
    removeQueueItem,
    clearQueue,
    undoLastScan,
    onProductCreated,
    processQueue,
  } = useScanSession({
    products,
    onComplete: onStockUpdated,
  });

  const [cameraOpen, setCameraOpen] = useState(false);
  const [shelfPickerOpen, setShelfPickerOpen] = useState(false);
  const [quickAddItemId, setQuickAddItemId] = useState<string | null>(null);
  const [quickAddBarcode, setQuickAddBarcode] = useState<string>('');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryResult, setSummaryResult] = useState<any>(null);

  // Start session on mount
  useEffect(() => {
    if (isOpen && !session) {
      startSession(initialMode, prefillProduct);
    }
  }, [isOpen]);

  // Hardware scanner
  const hwScanner = useHardwareScanner({
    enabled: isOpen && (session?.inputMethod === 'hardware' || session?.inputMethod === 'both'),
    onScan: handleScan,
  });

  const handleCameraScan = useCallback(async (code: string) => {
    await handleScan(code);
    // Keep camera open for continuous scanning
  }, [handleScan]);

  const handleConfirm = async () => {
    const result = await processQueue();
    if (result) {
      setSummaryResult(result);
      setShowSummary(true);
    }
  };

  const handleDone = () => {
    setShowSummary(false);
    endSession();
    onClose();
  };

  if (!isOpen || !session) return null;

  const pendingCount = session.queue.filter(q => q.status === 'pending').length;
  const notFoundCount = session.queue.filter(q => q.status === 'not_found').length;

  const modeLabels: Record<ScanSessionMode, string> = {
    in: 'Stok Girişi',
    out: 'Stok Çıkışı',
    transfer: 'Transfer',
    count: 'Sayım',
  };

  const modeColors: Record<ScanSessionMode, string> = {
    in: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    out: 'bg-red-500/10 text-red-600 border-red-500/30',
    transfer: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    count: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  };

  // Show summary
  if (showSummary && summaryResult) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ScanSessionSummary result={summaryResult} onDone={handleDone} />
      </div>
    );
  }

  // Quick add flow
  const quickAddItem = session.queue.find(q => q.id === quickAddItemId);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {hwScanner.HiddenInput}

      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('text-xs font-semibold', modeColors[session.mode])}>
            {modeLabels[session.mode]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {pendingCount} ürün
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { endSession(); onClose(); }}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Header controls */}
      <ScanSessionHeader
        session={session}
        onScanTargetChange={setScanTarget}
        onInputMethodChange={setInputMethod}
        onOpenShelfPicker={() => setShelfPickerOpen(true)}
        onTransferStepChange={setTransferStep}
      />

      {/* Transfer shelf status */}
      {session.mode === 'transfer' && (
        <div className="px-3 py-2 border-b bg-blue-500/5 shrink-0 flex items-center gap-2 text-sm">
          <ArrowRightLeft className="w-4 h-4 text-blue-500" />
          <span className="text-muted-foreground">
            {session.fromShelfName || '(Kaynak seçin)'} → {session.toShelfName || '(Hedef seçin)'}
          </span>
        </div>
      )}

      {/* Active shelf display */}
      {session.mode !== 'transfer' && session.activeShelfName && (
        <div className="px-3 py-2 border-b bg-primary/5 shrink-0 flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium">{session.activeShelfName}</span>
          <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => setActiveShelf(null, null)}>
            Temizle
          </Button>
        </div>
      )}

      {/* Scan buttons area */}
      <div className="px-3 py-3 border-b shrink-0 flex gap-2">
        {(session.inputMethod === 'camera' || session.inputMethod === 'both') && (
          <Button
            size="lg"
            className="flex-1 h-14 text-base gap-2"
            onClick={() => setCameraOpen(true)}
          >
            <Camera className="w-5 h-5" />
            Kamerayı Aç
          </Button>
        )}
        {(session.inputMethod === 'hardware' || session.inputMethod === 'both') && (
          <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/30">
            <Keyboard className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {hwScanner.isListening ? 'Donanım tarayıcı aktif' : 'Bekleniyor...'}
            </span>
          </div>
        )}
      </div>

      {/* Queue */}
      <div className="flex-1 overflow-y-auto">
        {session.queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
            <ScanBarcode className="w-16 h-16 opacity-30" />
            <p className="text-sm">Taramaya başlamak için kamerayı açın</p>
            <p className="text-xs opacity-60">veya donanım tarayıcıyla barkod okutun</p>
          </div>
        ) : (
          <ScanSessionQueue
            items={session.queue}
            scanTarget={session.scanTarget}
            allowNegativeStock={settings.allowNegativeStock}
            mode={session.mode}
            products={products}
            onUpdateItem={updateQueueItem}
            onRemoveItem={removeQueueItem}
            onQuickAdd={(itemId, barcode) => {
              setQuickAddItemId(itemId);
              setQuickAddBarcode(barcode);
            }}
          />
        )}
      </div>

      {/* Bottom action bar */}
      {session.queue.length > 0 && (
        <div className="border-t bg-card px-3 py-3 shrink-0 space-y-2" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Package className="w-3.5 h-3.5" />
            {pendingCount} bekleyen
            {notFoundCount > 0 && (
              <>
                <span className="mx-1">•</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                {notFoundCount} bulunamadı
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={undoLastScan} disabled={session.queue.length === 0}>
              <Undo2 className="w-4 h-4 mr-1" />
              Geri Al
            </Button>
            <Button variant="outline" size="sm" onClick={clearQueue} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-1" />
              Temizle
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-2"
              disabled={pendingCount === 0 || isProcessing}
              onClick={handleConfirm}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isProcessing ? 'İşleniyor...' : `Onayla (${pendingCount})`}
            </Button>
          </div>
        </div>
      )}

      {/* Camera scanner overlay */}
      {cameraOpen && (
        <Suspense fallback={null}>
          <LazyBarcodeScanner
            isOpen={cameraOpen}
            onClose={() => setCameraOpen(false)}
            onScan={handleCameraScan}
            continuous
          />
        </Suspense>
      )}

      {/* Shelf picker */}
      {shelfPickerOpen && (
        <ScanSessionShelfPicker
          isOpen={shelfPickerOpen}
          onClose={() => setShelfPickerOpen(false)}
          onSelectShelf={(id, name) => {
            setActiveShelf(id, name);
            setShelfPickerOpen(false);
          }}
        />
      )}

      {/* Quick add product */}
      {quickAddItemId && (
        <ScanSessionQuickAdd
          isOpen={!!quickAddItemId}
          onClose={() => { setQuickAddItemId(null); setQuickAddBarcode(''); }}
          barcode={quickAddBarcode}
          activeShelfId={session.activeShelfId}
          activeShelfName={session.activeShelfName}
          onProductCreated={(product) => {
            onProductCreated(quickAddItemId, product);
            setQuickAddItemId(null);
            setQuickAddBarcode('');
          }}
        />
      )}
    </div>
  );
}
