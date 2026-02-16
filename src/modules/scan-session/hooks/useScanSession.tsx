import { useState, useCallback, useRef, useEffect } from 'react';
import { Product } from '@/types/stock';
import { toast } from 'sonner';
import {
  ScanSessionState,
  ScanQueueItem,
  ScanSessionMode,
  ScanTarget,
  ScanInputMethod,
  ScanSessionResult,
  SCAN_SESSION_STORAGE_KEY,
} from '../types';
import { useScanSessionSettings } from './useScanSessionSettings';
import { stockService, StockMovementInput } from '@/services/stockService';
import { addToOfflineQueue, isOnline } from '@/lib/offlineSync';
import { supabase } from '@/integrations/supabase/client';

function createSessionId() {
  return `ss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function playBeep(success: boolean) {
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
  } catch { /* ignore audio errors */ }
}

function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
}

interface UseScanSessionOptions {
  products: Product[];
  onComplete?: () => void;
}

export function useScanSession({ products, onComplete }: UseScanSessionOptions) {
  const settings = useScanSessionSettings();
  const lastScanTimeRef = useRef<Record<string, number>>({});

  const [session, setSession] = useState<ScanSessionState | null>(() => {
    // Restore from localStorage if exists
    try {
      const stored = localStorage.getItem(SCAN_SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ScanSessionState;
        if (parsed.queue.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return null;
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Persist session to localStorage
  useEffect(() => {
    if (session) {
      localStorage.setItem(SCAN_SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SCAN_SESSION_STORAGE_KEY);
    }
  }, [session]);

  const startSession = useCallback((mode: ScanSessionMode, prefillProduct?: Product) => {
    const newSession: ScanSessionState = {
      id: createSessionId(),
      mode,
      scanTarget: settings.defaultScanTarget,
      inputMethod: settings.defaultInputMethod,
      activeShelfId: null,
      activeShelfName: null,
      fromShelfId: null,
      fromShelfName: null,
      toShelfId: null,
      toShelfName: null,
      transferStep: 'from',
      queue: [],
      startedAt: Date.now(),
      lastScanAt: null,
    };

    // If prefilling a product
    if (prefillProduct) {
      const item: ScanQueueItem = {
        id: crypto.randomUUID(),
        barcode: prefillProduct.barkod || prefillProduct.urunKodu,
        productId: prefillProduct.id,
        productName: prefillProduct.urunAdi,
        productCode: prefillProduct.urunKodu,
        units: 1,
        sets: 0,
        shelfId: null,
        shelfName: prefillProduct.rafKonum || null,
        status: 'pending',
        scannedAt: Date.now(),
      };
      newSession.queue = [item];
    }

    setSession(newSession);
    lastScanTimeRef.current = {};
  }, [settings]);

  const endSession = useCallback(() => {
    setSession(null);
    localStorage.removeItem(SCAN_SESSION_STORAGE_KEY);
  }, []);

  const setScanTarget = useCallback((target: ScanTarget) => {
    setSession(prev => prev ? { ...prev, scanTarget: target } : null);
  }, []);

  const setInputMethod = useCallback((method: ScanInputMethod) => {
    setSession(prev => prev ? { ...prev, inputMethod: method } : null);
  }, []);

  const setActiveShelf = useCallback((shelfId: string | null, shelfName: string | null) => {
    setSession(prev => {
      if (!prev) return null;
      if (prev.mode === 'transfer') {
        if (prev.transferStep === 'from') {
          return { ...prev, fromShelfId: shelfId, fromShelfName: shelfName, transferStep: 'scan' };
        }
        if (prev.transferStep === 'to') {
          return { ...prev, toShelfId: shelfId, toShelfName: shelfName };
        }
        return prev;
      }
      return { ...prev, activeShelfId: shelfId, activeShelfName: shelfName };
    });
  }, []);

  const setTransferStep = useCallback((step: 'from' | 'scan' | 'to') => {
    setSession(prev => prev ? { ...prev, transferStep: step } : null);
  }, []);

  // Check if a barcode matches a shelf
  const checkShelfBarcode = useCallback(async (barcode: string): Promise<boolean> => {
    // Check if barcode matches a shelf name (e.g. QR code with shelf name)
    const { data: shelf } = await supabase
      .from('shelves')
      .select('id, name')
      .or(`name.eq.${barcode},id.eq.${barcode}`)
      .maybeSingle();

    if (shelf) {
      setActiveShelf(shelf.id, shelf.name);
      playBeep(true);
      triggerHaptic();
      toast.success(`Raf seçildi: ${shelf.name}`, { duration: 2000 });
      return true;
    }
    return false;
  }, [setActiveShelf]);

  const handleScan = useCallback(async (barcode: string) => {
    if (!session) return;

    // Cooldown check
    const now = Date.now();
    const lastTime = lastScanTimeRef.current[barcode] || 0;
    if (now - lastTime < settings.cooldownMs) return;
    lastScanTimeRef.current[barcode] = now;

    // Check if this is a shelf barcode first
    const isShelf = await checkShelfBarcode(barcode);
    if (isShelf) return;

    // Find product
    const product = products.find(
      p => p.barkod === barcode || p.urunKodu === barcode
    );

    setSession(prev => {
      if (!prev) return null;

      // Check if already in queue
      const existingIndex = prev.queue.findIndex(
        q => q.barcode === barcode && (q.status === 'pending' || q.status === 'not_found')
      );

      if (existingIndex >= 0) {
        // Increment quantity
        const updated = [...prev.queue];
        if (prev.scanTarget === 'sets') {
          updated[existingIndex] = { ...updated[existingIndex], sets: updated[existingIndex].sets + 1 };
        } else {
          updated[existingIndex] = { ...updated[existingIndex], units: updated[existingIndex].units + 1 };
        }
        const item = updated[existingIndex];
        playBeep(true);
        triggerHaptic();
        toast.success(`${item.productName} → ${item.units} adet, ${item.sets} set`, { duration: 1500 });
        return { ...prev, queue: updated, lastScanAt: now };
      }

      // New item
      const newItem: ScanQueueItem = {
        id: crypto.randomUUID(),
        barcode,
        productId: product?.id || null,
        productName: product?.urunAdi || null,
        productCode: product?.urunKodu || null,
        units: prev.scanTarget === 'sets' ? 0 : 1,
        sets: prev.scanTarget === 'units' ? 0 : 1,
        shelfId: prev.activeShelfId,
        shelfName: prev.activeShelfName,
        status: product ? 'pending' : 'not_found',
        scannedAt: now,
      };

      if (product) {
        playBeep(true);
        triggerHaptic();
        toast.success(`${product.urunAdi} eklendi`, { duration: 1500 });
      } else {
        playBeep(false);
        triggerHaptic();
        toast.warning(`Barkod bulunamadı: ${barcode}`, { duration: 2000 });
      }

      return { ...prev, queue: [newItem, ...prev.queue], lastScanAt: now };
    });
  }, [session, products, settings, checkShelfBarcode]);

  const updateQueueItem = useCallback((itemId: string, updates: Partial<ScanQueueItem>) => {
    setSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        queue: prev.queue.map(q => q.id === itemId ? { ...q, ...updates } : q),
      };
    });
  }, []);

  const removeQueueItem = useCallback((itemId: string) => {
    setSession(prev => {
      if (!prev) return null;
      return { ...prev, queue: prev.queue.filter(q => q.id !== itemId) };
    });
  }, []);

  const clearQueue = useCallback(() => {
    setSession(prev => prev ? { ...prev, queue: [] } : null);
  }, []);

  const undoLastScan = useCallback(() => {
    setSession(prev => {
      if (!prev || prev.queue.length === 0) return prev;
      const removed = prev.queue[0];
      toast.info(`Geri alındı: ${removed.productName || removed.barcode}`, { duration: 1500 });
      return { ...prev, queue: prev.queue.slice(1) };
    });
  }, []);

  // Quick-add product: update queue item after creating product
  const onProductCreated = useCallback((itemId: string, product: Product) => {
    updateQueueItem(itemId, {
      productId: product.id,
      productName: product.urunAdi,
      productCode: product.urunKodu,
      status: 'pending',
    });
  }, [updateQueueItem]);

  // Process the entire queue
  const processQueue = useCallback(async (): Promise<ScanSessionResult | null> => {
    if (!session) return null;
    const pendingItems = session.queue.filter(q => q.status === 'pending' && q.productId && (q.units > 0 || q.sets > 0));
    if (pendingItems.length === 0) {
      toast.error('İşlenecek ürün bulunamadı (miktar 0 olamaz)');
      return null;
    }

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;
    let totalUnits = 0;
    let totalSets = 0;

    for (const item of pendingItems) {
      const now = new Date();
      const movementType: 'giris' | 'cikis' = session.mode === 'out' ? 'cikis' : 'giris';

      if (session.mode === 'transfer') {
        // Create OUT from source shelf
        const outInput: StockMovementInput = {
          productId: item.productId!,
          type: 'cikis',
          quantity: item.units,
          setQuantity: item.sets,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().slice(0, 5),
          note: `Transfer: ${session.fromShelfName} → ${session.toShelfName} [Oturum: ${session.id}]`,
          shelfId: session.fromShelfId || undefined,
        };
        const outResult = await stockService.createMovement(outInput);

        // Create IN to destination shelf
        const inInput: StockMovementInput = {
          productId: item.productId!,
          type: 'giris',
          quantity: item.units,
          setQuantity: item.sets,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().slice(0, 5),
          note: `Transfer: ${session.fromShelfName} → ${session.toShelfName} [Oturum: ${session.id}]`,
          shelfId: session.toShelfId || undefined,
        };
        const inResult = await stockService.createMovement(inInput);

        if (outResult && inResult) {
          updateQueueItem(item.id, { status: 'processed' });
          successCount++;
          totalUnits += item.units;
          totalSets += item.sets;
        } else {
          updateQueueItem(item.id, { status: 'error', errorMessage: 'Transfer başarısız' });
          errorCount++;
        }
      } else {
        // Standard in/out/count
        const effectiveShelfId = item.shelfId || session.activeShelfId || undefined;
        const effectiveShelfName = item.shelfName || session.activeShelfName || undefined;

        const input: StockMovementInput = {
          productId: item.productId!,
          type: session.mode === 'count' ? 'giris' : movementType,
          quantity: item.units,
          setQuantity: item.sets,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().slice(0, 5),
          note: `Tarama oturumu [${session.id}]`,
          shelfId: effectiveShelfId,
        };

        const result = await stockService.createMovement(input);
        if (result) {
          // Update product's raf_konum to match the shelf
          if (effectiveShelfName && item.productId) {
            await supabase
              .from('products')
              .update({ raf_konum: effectiveShelfName })
              .eq('id', item.productId);
          }
          updateQueueItem(item.id, { status: 'processed' });
          successCount++;
          totalUnits += item.units;
          totalSets += item.sets;
        } else {
          updateQueueItem(item.id, { status: 'error', errorMessage: 'İşlem başarısız' });
          errorCount++;
        }
      }
    }

    setIsProcessing(false);

    const result: ScanSessionResult = {
      sessionId: session.id,
      mode: session.mode,
      totalLines: pendingItems.length,
      totalUnits,
      totalSets,
      successCount,
      errorCount,
      processedAt: Date.now(),
    };

    if (successCount > 0) {
      toast.success(`${successCount} işlem başarılı${errorCount > 0 ? `, ${errorCount} hata` : ''}`);
      onComplete?.();
    }

    return result;
  }, [session, updateQueueItem, onComplete]);

  return {
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
  };
}
