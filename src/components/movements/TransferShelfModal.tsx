import { useState, useEffect } from 'react';
import { ArrowRight, Package, MapPin, RefreshCw, FileText } from 'lucide-react';
import { Product } from '@/types/stock';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ShelfSelector } from '@/components/shelves/ShelfSelector';
import { useShelves, Shelf } from '@/hooks/useShelves';
import { stockService } from '@/services/stockService';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';

interface TransferShelfModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onTransferred?: () => void;
  preSelectedProductId?: string;
}

export function TransferShelfModal({
  isOpen,
  onClose,
  products,
  onTransferred,
  preSelectedProductId,
}: TransferShelfModalProps) {
  const { shelves, addShelf } = useShelves();
  const [productId, setProductId] = useState('');
  const [targetShelfId, setTargetShelfId] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openProductCombobox, setOpenProductCombobox] = useState(false);

  const selectedProduct = products.find(p => p.id === productId);
  const targetShelf = shelves.find(s => s.id === targetShelfId);

  useEffect(() => {
    if (preSelectedProductId) {
      setProductId(preSelectedProductId);
    }
  }, [preSelectedProductId]);

  const handleTargetShelfSelect = (shelf: Shelf) => {
    setTargetShelfId(shelf.id);
  };

  const canSubmit = selectedProduct && targetShelf && targetShelf.name !== selectedProduct.rafKonum;

  const handleSubmit = async () => {
    if (!selectedProduct || !targetShelf) return;

    setIsSubmitting(true);
    const success = await stockService.transferShelf({
      productId: selectedProduct.id,
      fromShelfName: selectedProduct.rafKonum,
      toShelfId: targetShelf.id,
      toShelfName: targetShelf.name,
      note: note || undefined,
    });
    setIsSubmitting(false);

    if (success) {
      onTransferred?.();
      handleClose();
    }
  };

  const handleClose = () => {
    setProductId('');
    setTargetShelfId(undefined);
    setNote('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            Raf Transferi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Ürün Seçin *
            </Label>
            <Popover open={openProductCombobox} onOpenChange={setOpenProductCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between h-auto min-h-10 py-2"
                >
                  {selectedProduct ? (
                    <div className="flex items-center gap-3 w-full text-left">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{selectedProduct.urunAdi}</div>
                        <div className="text-xs text-muted-foreground">
                          Kod: {selectedProduct.urunKodu}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Ürün seçin...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Ürün adı veya kodu ara..." />
                  <CommandList>
                    <CommandEmpty>Ürün bulunamadı</CommandEmpty>
                    <CommandGroup>
                      {products.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={`${product.urunAdi} ${product.urunKodu} ${product.barkod || ''}`}
                          onSelect={() => {
                            setProductId(product.id);
                            setOpenProductCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              productId === product.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-3 w-full">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{product.urunAdi}</div>
                              <div className="text-xs text-muted-foreground">
                                {product.urunKodu} | <MapPin className="w-3 h-3 inline" /> {product.rafKonum}
                              </div>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Current → Target Display */}
          {selectedProduct && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">Mevcut Raf</p>
                <div className="flex items-center justify-center gap-1.5">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">{selectedProduct.rafKonum}</span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">Hedef Raf</p>
                {targetShelf ? (
                  <div className="flex items-center justify-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-primary">{targetShelf.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Seçilmedi</span>
                )}
              </div>
            </div>
          )}

          {/* Target Shelf Selector */}
          <ShelfSelector
            shelves={shelves.filter(s => !selectedProduct || s.name !== selectedProduct.rafKonum)}
            selectedShelfId={targetShelfId}
            onSelect={handleTargetShelfSelect}
            onAddNew={addShelf}
            label="Hedef Raf"
            placeholder="Transfer yapılacak rafı seçin..."
            required
          />

          {/* Same shelf warning */}
          {selectedProduct && targetShelf && targetShelf.name === selectedProduct.rafKonum && (
            <p className="text-sm text-destructive">
              Ürün zaten bu rafta. Farklı bir raf seçin.
            </p>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Not (opsiyonel)
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Transfer sebebi..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            İptal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Transfer Ediliyor...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Transfer Et
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
