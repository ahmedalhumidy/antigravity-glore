import { useState, useRef, useEffect, useCallback } from 'react';
import { ScanLine, X, Search, Package, MapPin, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { findByBarcode } from '@/lib/globalSearch';
import { Product } from '@/types/stock';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface GlobalScanModalProps {
  products: Product[];
  onProductFound: (product: Product) => void;
  onBarcodeNotFound: (barcode: string) => void;
  onNavigateToShelf: () => void;
}

export function GlobalScanModal({ products, onProductFound, onBarcodeNotFound, onNavigateToShelf }: GlobalScanModalProps) {
  const [open, setOpen] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleScan = useCallback(async () => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    setScanning(true);
    try {
      const result = await findByBarcode(trimmed);

      setOpen(false);
      setBarcode('');

      if (result.type === 'product') {
        const product = products.find(p => p.id === result.id);
        if (product) {
          onProductFound(product);
          toast.success(`Ürün bulundu: ${product.urunAdi}`);
        }
      } else if (result.type === 'shelf') {
        onNavigateToShelf();
        toast.success(`Raf bulundu: ${result.data?.name}`);
      } else {
        onBarcodeNotFound(trimmed);
        toast.info('Barkod tanınmadı — Yeni ürün oluşturuluyor');
      }
    } catch {
      toast.error('Tarama sırasında hata oluştu');
    } finally {
      setScanning(false);
    }
  }, [barcode, products, onProductFound, onBarcodeNotFound, onNavigateToShelf]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan();
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="h-9 w-9"
          >
            <ScanLine className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Barkod Tara</p>
        </TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary" />
              Barkod Tara
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Barkod veya ürün kodu girin..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 h-12 text-base"
                autoComplete="off"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="w-3.5 h-3.5" />
              <span>Ürün bulunursa detay açılır</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>Raf kodu bulunursa konum sayfasına yönlendirilir</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Search className="w-3.5 h-3.5" />
              <span>Bilinmeyen barkod → yeni ürün oluşturulur</span>
            </div>

            <Button
              onClick={handleScan}
              disabled={!barcode.trim() || scanning}
              className="w-full h-11"
            >
              {scanning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ScanLine className="w-4 h-4 mr-2" />
              )}
              {scanning ? 'Aranıyor...' : 'Tara'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
