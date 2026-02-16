import { useState } from 'react';
import { Package, Plus, X, MapPin } from 'lucide-react';
import { Product } from '@/types/stock';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QuickStockInput } from '@/components/stock/QuickStockInput';
import { ShelfSelector } from '@/components/shelves/ShelfSelector';
import { useShelves, Shelf } from '@/hooks/useShelves';

interface BarcodeResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  barcode: string | null;
  onAddNewProduct: (barcode: string) => void;
  onStockUpdated?: () => void;
}

export function BarcodeResultModal({
  isOpen,
  onClose,
  product,
  barcode,
  onAddNewProduct,
  onStockUpdated,
}: BarcodeResultModalProps) {
  const { shelves, addShelf } = useShelves();
  const [showShelfAdd, setShowShelfAdd] = useState(false);

  const handleAddNew = () => {
    if (barcode) {
      onAddNewProduct(barcode);
      onClose();
    }
  };

  const handleSuccess = () => {
    onStockUpdated?.();
    onClose();
  };

  // Product found - show quick stock input
  if (product) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              {product.urunAdi}
            </DialogTitle>
          </DialogHeader>

          <div className="text-sm text-muted-foreground mb-2">
            <span className="font-mono bg-muted px-2 py-0.5 rounded">{product.urunKodu}</span>
            {product.barkod && (
              <span className="ml-2 font-mono text-xs">{product.barkod}</span>
            )}
          </div>

          <QuickStockInput
            product={product}
            onSuccess={handleSuccess}
            showShelfSelector={true}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Product not found - show add new option
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Package className="w-5 h-5 text-destructive" />
            </div>
            Ürün Bulunamadı
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 text-center">
          <p className="text-muted-foreground mb-2">
            Bu barkoda kayıtlı ürün bulunamadı:
          </p>
          <p className="font-mono text-lg bg-muted px-4 py-2 rounded-lg inline-block">
            {barcode}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              İptal
            </Button>
            <Button className="flex-1 gradient-accent border-0" onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Ürün Ekle
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => setShowShelfAdd(true)}
          >
            <MapPin className="w-4 h-4" />
            Yeni Raf Ekle
          </Button>
        </div>

        {showShelfAdd && (
          <div className="pt-2">
            <ShelfSelector
              shelves={shelves}
              onSelect={() => setShowShelfAdd(false)}
              onAddNew={addShelf}
              label="Yeni Raf Oluştur"
              placeholder="Raf seçin veya yeni ekleyin..."
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
