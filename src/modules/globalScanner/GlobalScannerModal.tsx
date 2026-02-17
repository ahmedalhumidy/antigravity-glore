import { useState, useRef, useCallback, lazy, Suspense } from 'react';
import { Camera, Keyboard, Layers, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGlobalScanner } from './GlobalScannerProvider';
import { useHaptics } from '@/hooks/useHaptics';
import { findByBarcode } from '@/lib/globalSearch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { BatchQueuePanel } from './BatchQueuePanel';
import { Product } from '@/types/stock';
import { Html5Qrcode } from 'html5-qrcode';
import { useEffect } from 'react';

function InlineScanner({ onScan, continuous }: { onScan: (code: string) => void; continuous: boolean }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'global-scanner-container';
  const lastScanRef = useRef('');
  const lastScanTimeRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!mounted || !devices.length) return;
        const backIdx = devices.findIndex(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('arka'));
        const camId = devices[backIdx >= 0 ? backIdx : 0].id;

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(camId, { fps: 10, qrbox: { width: 250, height: 150 } }, (text) => {
          const now = Date.now();
          if (text === lastScanRef.current && now - lastScanTimeRef.current < 1500) return;
          lastScanRef.current = text;
          lastScanTimeRef.current = now;
          onScan(text);
        }, () => {});
      } catch (err) {
        console.error('Scanner error:', err);
      }
    };

    start();

    return () => {
      mounted = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="relative">
      <div id={containerId} className="w-full bg-black min-h-[280px]" />
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="relative w-[260px] h-[160px]">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
          <div className="absolute inset-x-2 top-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function GlobalScannerModal({ products }: { products: Product[] }) {
  const {
    scannerOpen,
    closeScanner,
    batchMode,
    toggleBatchMode,
    addToQueue,
    openCopilot,
    openQuickCreate,
  } = useGlobalScanner();
  const { strongHaptic } = useHaptics();
  const navigate = useNavigate();

  const [manualInput, setManualInput] = useState('');
  const [activeTab, setActiveTab] = useState<string>('camera');

  const logScan = async (barcode: string, result: string, productId?: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      await supabase.from('scan_logs').insert({
        barcode,
        result,
        product_id: productId || null,
        user_id: session.session?.user.id || null,
      });
    } catch {}
  };

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    strongHaptic();
    const result = await findByBarcode(barcode);

    if (result.type === 'product' && result.id) {
      const product = products.find(p => p.id === result.id) || (result.data ? {
        id: result.data.id,
        urunKodu: result.data.urun_kodu,
        urunAdi: result.data.urun_adi,
        rafKonum: result.data.raf_konum || 'Genel',
        barkod: result.data.barkod || undefined,
        acilisStok: result.data.acilis_stok || 0,
        toplamGiris: result.data.toplam_giris || 0,
        toplamCikis: result.data.toplam_cikis || 0,
        mevcutStok: result.data.mevcut_stok || 0,
        setStok: result.data.set_stok || 0,
        minStok: result.data.min_stok || 0,
        uyari: result.data.uyari || false,
        category: result.data.category || undefined,
      } as Product : null);
      await logScan(barcode, 'found', result.id);

      if (batchMode && product) {
        addToQueue({ barcode, product, quantity: 1, found: true });
        toast.success(`${product.urunAdi} kuyruğa eklendi`);
      } else if (product) {
        closeScanner();
        openCopilot(product);
      }
    } else if (result.type === 'shelf' && result.id) {
      await logScan(barcode, 'shelf');
      closeScanner();
      navigate('/locations');
      toast.info(`Raf bulundu: ${result.data?.name}`);
    } else {
      await logScan(barcode, 'not_found');
      if (batchMode) {
        addToQueue({ barcode, quantity: 1, found: false });
        toast.warning(`Bilinmeyen barkod: ${barcode}`);
      } else {
        closeScanner();
        openQuickCreate(barcode);
      }
    }
  }, [products, batchMode, strongHaptic, addToQueue, closeScanner, openCopilot, openQuickCreate, navigate]);

  const handleManualSearch = () => {
    if (manualInput.trim()) {
      handleBarcodeScan(manualInput.trim());
      setManualInput('');
    }
  };

  if (!scannerOpen) return null;

  return (
    <Dialog open={scannerOpen} onOpenChange={(open) => { if (!open) closeScanner(); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Warehouse Copilot
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant={batchMode ? 'default' : 'outline'}
              size="sm"
              onClick={toggleBatchMode}
              className="gap-1.5"
            >
              <Layers className="w-4 h-4" />
              Toplu
            </Button>
            <Button variant="ghost" size="icon" onClick={closeScanner}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0">
            <TabsTrigger
              value="camera"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Kamera
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3"
            >
              <Keyboard className="w-4 h-4 mr-1.5" />
              Manuel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="m-0">
            {activeTab === 'camera' && (
              <InlineScanner onScan={handleBarcodeScan} continuous={batchMode} />
            )}
          </TabsContent>

          <TabsContent value="manual" className="m-0 p-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Barkod veya ürün kodu girin..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                  autoFocus
                  className="flex-1"
                />
                <Button onClick={handleManualSearch} disabled={!manualInput.trim()}>
                  Ara
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Barkod veya ürün kodunu yazıp Enter'a basın
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Batch Queue */}
        {batchMode && <BatchQueuePanel products={products} />}
      </DialogContent>
    </Dialog>
  );
}
