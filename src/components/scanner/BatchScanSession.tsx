import { useState, useCallback, useRef, Suspense, lazy } from 'react';
import {
  Camera, X, Package, Check, AlertTriangle, Trash2,
  Plus, Minus, ScanBarcode, Layers, ChevronDown, ChevronUp, MapPin,
} from 'lucide-react';
import { Product } from '@/types/stock';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { BatchScanItem, BatchScanItemCard } from './BatchScanItemCard';
import { BatchScanSummary } from './BatchScanSummary';
import { QuickAddProductForm } from './QuickAddProductForm';
import { stockService } from '@/services/stockService';
import { useShelves } from '@/hooks/useShelves';
import { ShelfSelector } from '@/components/shelves/ShelfSelector';

const LazyBarcodeScanner = lazy(() =>
  import('./BarcodeScanner').then((m) => ({ default: m.BarcodeScanner }))
);

interface BatchScanSessionProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onStockUpdated?: () => void;
  onAddNewProduct?: (barcode: string) => void;
}

export function BatchScanSession({
  isOpen,
  onClose,
  products,
  onStockUpdated,
  onAddNewProduct,
}: BatchScanSessionProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [items, setItems] = useState<BatchScanItem[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [quickAddBarcode, setQuickAddBarcode] = useState<string | null>(null);
  const [showShelfAdd, setShowShelfAdd] = useState(false);
  const scanCountRef = useRef(0);
  const { shelves, addShelf } = useShelves();

  const playBeep = useCallback((success: boolean) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = success ? 880 : 300;
      osc.type = success ? 'sine' : 'square';
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + (success ? 0.12 : 0.25));
    } catch {
      // Audio not available
    }
  }, []);

  const handleScan = useCallback(
    (code: string) => {
      const product = products.find(
        (p) => p.barkod === code || p.urunKodu === code
      );

      scanCountRef.current += 1;

      if (product) {
        // Check if already scanned
        const existingIdx = items.findIndex((i) => i.product?.id === product.id);
        if (existingIdx >= 0) {
          // Increment quantity
          setItems((prev) =>
            prev.map((item, idx) =>
              idx === existingIdx
                ? { ...item, quantity: item.quantity + 1, scanCount: item.scanCount + 1 }
                : item
            )
          );
          playBeep(true);
          toast.success(`${product.urunAdi} — miktar artırıldı`, { duration: 1500 });
        } else {
          // Add new item
          const newItem: BatchScanItem = {
            id: crypto.randomUUID(),
            barcode: code,
            product,
            quantity: 1,
            setQuantity: 0,
            type: 'giris',
            status: 'pending',
            scanCount: 1,
            scannedAt: new Date(),
          };
          setItems((prev) => [newItem, ...prev]);
          playBeep(true);
          toast.success(`✓ ${product.urunAdi}`, { duration: 1500 });
        }
      } else {
        // Unknown barcode
        const alreadyUnknown = items.find(
          (i) => !i.product && i.barcode === code
        );
        if (!alreadyUnknown) {
          const newItem: BatchScanItem = {
            id: crypto.randomUUID(),
            barcode: code,
            product: null,
            quantity: 1,
            setQuantity: 0,
            type: 'giris',
            status: 'not_found',
            scanCount: 1,
            scannedAt: new Date(),
          };
          setItems((prev) => [newItem, ...prev]);
          playBeep(false);
          toast.error(`Bilinmeyen barkod: ${code}`, { duration: 2000 });
        } else {
          playBeep(false);
          toast.error(`Barkod zaten listede: ${code}`, { duration: 1500 });
        }
      }

      // Re-open scanner for continuous scanning
      setTimeout(() => {
        setScannerOpen(true);
      }, 400);
    },
    [products, items, playBeep]
  );

  const updateItem = useCallback(
    (id: string, updates: Partial<BatchScanItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleProcessAll = async () => {
    const pendingItems = items.filter(
      (i) => i.status === 'pending' && i.product
    );
    if (pendingItems.length === 0) {
      toast.info('İşlenecek ürün yok');
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of pendingItems) {
      if (!item.product) continue;

      const now = new Date();
      const result = await stockService.createMovement({
        productId: item.product.id,
        type: item.type,
        quantity: item.quantity,
        setQuantity: item.setQuantity,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().slice(0, 5),
        note: `Toplu tarama — ${item.barcode}`,
      });

      if (result) {
        updateItem(item.id, { status: 'success' });
        successCount++;
      } else {
        updateItem(item.id, { status: 'error' });
        failCount++;
      }
    }

    setIsProcessing(false);

    if (successCount > 0) {
      toast.success(`${successCount} işlem başarıyla tamamlandı`);
      onStockUpdated?.();
    }
    if (failCount > 0) {
      toast.error(`${failCount} işlem başarısız oldu`);
    }

    setShowSummary(true);
  };

  const handleFinish = () => {
    setItems([]);
    setShowSummary(false);
    scanCountRef.current = 0;
    onClose();
  };

  const handleNewSession = () => {
    setItems([]);
    setShowSummary(false);
    scanCountRef.current = 0;
  };

  // When a product is created via quick-add, convert the not_found item to a pending item
  const handleQuickAddCreated = useCallback(
    (product: import('@/types/stock').Product) => {
      const bc = quickAddBarcode;
      if (!bc) return;
      setItems((prev) =>
        prev.map((item) =>
          item.barcode === bc && item.status === 'not_found'
            ? {
                ...item,
                product,
                status: 'pending' as const,
              }
            : item
        )
      );
      setQuickAddBarcode(null);
    },
    [quickAddBarcode]
  );

  const pendingCount = items.filter((i) => i.status === 'pending' && i.product).length;
  const successCount = items.filter((i) => i.status === 'success').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const notFoundCount = items.filter((i) => i.status === 'not_found').length;

  if (!isOpen) return null;

  if (showSummary) {
    return (
      <BatchScanSummary
        items={items}
        onNewSession={handleNewSession}
        onFinish={handleFinish}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card safe-area-top">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Toplu Tarama</h2>
            <p className="text-xs text-muted-foreground">
              {items.length} ürün tarandı
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleFinish}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border overflow-x-auto">
        <Badge variant="outline" className="shrink-0 gap-1">
          <Package className="w-3 h-3" />
          {items.length} tarandı
        </Badge>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="shrink-0 gap-1 bg-accent/10 text-accent-foreground border-accent/30">
            Bekleyen: {pendingCount}
          </Badge>
        )}
        {successCount > 0 && (
          <Badge variant="secondary" className="shrink-0 gap-1 bg-success/10 text-success border-success/30">
            <Check className="w-3 h-3" />
            {successCount}
          </Badge>
        )}
        {errorCount > 0 && (
          <Badge variant="destructive" className="shrink-0 gap-1">
            Hata: {errorCount}
          </Badge>
        )}
        {notFoundCount > 0 && (
          <Badge variant="outline" className="shrink-0 gap-1 text-muted-foreground">
            <AlertTriangle className="w-3 h-3" />
            {notFoundCount}
          </Badge>
        )}
      </div>

      {/* Scanned Items List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <ScanBarcode className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                Taramaya Başlayın
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Aşağıdaki "Tara" butonuna basarak barkodları art arda tarayın.
                Her tarama otomatik olarak listeye eklenir.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <BatchScanItemCard
                key={item.id}
                item={item}
                isExpanded={expandedItemId === item.id}
                onToggleExpand={() =>
                  setExpandedItemId(
                    expandedItemId === item.id ? null : item.id
                  )
                }
                onUpdateItem={updateItem}
                onRemoveItem={removeItem}
                onQuickAdd={(barcode) => setQuickAddBarcode(barcode)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="border-t border-border bg-card px-4 py-3 safe-area-bottom space-y-2">
        {showShelfAdd && (
          <div className="pb-2">
            <ShelfSelector
              shelves={shelves}
              onSelect={() => setShowShelfAdd(false)}
              onAddNew={addShelf}
              label="Yeni Raf Oluştur"
              placeholder="Raf seçin veya yeni ekleyin..."
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-12 gap-2 border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => setShowShelfAdd(!showShelfAdd)}
          >
            <MapPin className="w-5 h-5" />
            <span className="hidden sm:inline">Raf</span>
          </Button>

          <Button
            className="flex-1 h-12 gap-2 text-base"
            onClick={() => setScannerOpen(true)}
          >
            <ScanBarcode className="w-5 h-5" />
            Tara
          </Button>

          {pendingCount > 0 && (
            <Button
              variant="default"
              className="flex-1 h-12 gap-2 text-base bg-success hover:bg-success/90"
              onClick={handleProcessAll}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="animate-pulse">İşleniyor...</span>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  İşle ({pendingCount})
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Scanner Modal — reopens for continuous scanning */}
      {scannerOpen && (
        <Suspense fallback={null}>
          <LazyBarcodeScanner
            isOpen={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onScan={handleScan}
          />
        </Suspense>
      )}

      {/* Quick Add Product — inline within batch session */}
      {quickAddBarcode && (
        <QuickAddProductForm
          barcode={quickAddBarcode}
          isOpen={!!quickAddBarcode}
          onClose={() => setQuickAddBarcode(null)}
          onProductCreated={handleQuickAddCreated}
        />
      )}
    </div>
  );
}
