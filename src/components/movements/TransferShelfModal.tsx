import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Package, MapPin, RefreshCw, FileText, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Product } from '@/types/stock';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ShelfSelector } from '@/components/shelves/ShelfSelector';
import { useShelves, Shelf } from '@/hooks/useShelves';
import { stockService } from '@/services/stockService';
import { cn } from '@/lib/utils';

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetShelfId, setTargetShelfId] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [openShelves, setOpenShelves] = useState<Record<string, boolean>>({});

  const targetShelf = shelves.find(s => s.id === targetShelfId);
  const selectedProducts = products.filter(p => selectedIds.includes(p.id));

  useEffect(() => {
    if (preSelectedProductId) {
      setSelectedIds([preSelectedProductId]);
    }
  }, [preSelectedProductId]);

  // Filter includes shelf name search
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.urunAdi.toLowerCase().includes(q) ||
      p.urunKodu.toLowerCase().includes(q) ||
      (p.barkod && p.barkod.toLowerCase().includes(q)) ||
      p.rafKonum.toLowerCase().includes(q)
    );
  }, [products, search]);

  // Group by shelf, sorted alphabetically
  const groupedByShelf = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    for (const p of filteredProducts) {
      const key = p.rafKonum || 'Rafsız';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredProducts]);

  // Auto-open shelves when searching
  useEffect(() => {
    if (search) {
      const allOpen: Record<string, boolean> = {};
      groupedByShelf.forEach(([shelf]) => { allOpen[shelf] = true; });
      setOpenShelves(allOpen);
    }
  }, [search, groupedByShelf]);

  const toggleProduct = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleShelfAll = (shelfProducts: Product[]) => {
    const ids = shelfProducts.map(p => p.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const toggleShelfOpen = (shelf: string) => {
    setOpenShelves(prev => ({ ...prev, [shelf]: !prev[shelf] }));
  };

  const handleTargetShelfSelect = (shelf: Shelf) => {
    setTargetShelfId(shelf.id);
  };

  const canSubmit =
    selectedProducts.length > 0 &&
    targetShelf &&
    selectedProducts.some(p => p.rafKonum !== targetShelf.name);

  const handleSubmit = async () => {
    if (!targetShelf || selectedProducts.length === 0) return;
    setIsSubmitting(true);
    let successCount = 0;
    for (const product of selectedProducts) {
      if (product.rafKonum === targetShelf.name) continue;
      const success = await stockService.transferShelf({
        productId: product.id,
        fromShelfName: product.rafKonum,
        toShelfId: targetShelf.id,
        toShelfName: targetShelf.name,
        note: note || undefined,
      });
      if (success) successCount++;
    }
    setIsSubmitting(false);
    if (successCount > 0) {
      onTransferred?.();
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedIds([]);
    setTargetShelfId(undefined);
    setNote('');
    setSearch('');
    setOpenShelves({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            Raf Transferi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col">
          {/* Product Selection */}
          <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Ürün Seçin *
              {selectedIds.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedIds.length} seçili
                </Badge>
              )}
            </Label>

            {/* Selected chips */}
            {selectedProducts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedProducts.map(p => (
                  <Badge
                    key={p.id}
                    variant="outline"
                    className="gap-1 pr-1 cursor-pointer hover:bg-destructive/10"
                    onClick={() => toggleProduct(p.id)}
                  >
                    {p.urunAdi}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            )}

            {/* Search */}
            <Input
              placeholder="Ürün adı, kodu, barkod veya raf adı ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            {/* Grouped Product List */}
            <ScrollArea className="h-[240px] border rounded-lg">
              <div className="p-1">
                {groupedByShelf.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Ürün bulunamadı
                  </p>
                ) : (
                  groupedByShelf.map(([shelfName, shelfProducts]) => {
                    const isOpen = openShelves[shelfName] ?? false;
                    const shelfIds = shelfProducts.map(p => p.id);
                    const allSelected = shelfIds.every(id => selectedIds.includes(id));
                    const someSelected = shelfIds.some(id => selectedIds.includes(id));

                    return (
                      <Collapsible
                        key={shelfName}
                        open={isOpen}
                        onOpenChange={() => toggleShelfOpen(shelfName)}
                      >
                        <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted/50 group">
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center gap-2 flex-1 text-left"
                            >
                              {isOpen ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                              <MapPin className="w-3.5 h-3.5 text-primary" />
                              <span className="font-medium text-sm">{shelfName}</span>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                {shelfProducts.length}
                              </Badge>
                            </button>
                          </CollapsibleTrigger>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleShelfAll(shelfProducts);
                            }}
                          >
                            {allSelected ? 'Kaldır' : 'Tümünü Seç'}
                          </Button>
                        </div>

                        <CollapsibleContent>
                          <div className="pl-6 space-y-0.5 pb-1">
                            {shelfProducts.map(product => {
                              const isSelected = selectedIds.includes(product.id);
                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => toggleProduct(product.id)}
                                  className={cn(
                                    'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
                                    isSelected
                                      ? 'bg-primary/10 border border-primary/30'
                                      : 'hover:bg-muted/50 border border-transparent'
                                  )}
                                >
                                  <Checkbox checked={isSelected} className="pointer-events-none" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate text-sm">{product.urunAdi}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {product.urunKodu}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Current → Target Display */}
          {selectedProducts.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">Mevcut Raflar</p>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {[...new Set(selectedProducts.map(p => p.rafKonum))].map(loc => (
                    <Badge key={loc} variant="outline" className="text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      {loc}
                    </Badge>
                  ))}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">Hedef Raf</p>
                {targetShelf ? (
                  <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                    <MapPin className="w-3 h-3 mr-1" />
                    {targetShelf.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Seçilmedi</span>
                )}
              </div>
            </div>
          )}

          {/* Target Shelf Selector */}
          <ShelfSelector
            shelves={shelves}
            selectedShelfId={targetShelfId}
            onSelect={handleTargetShelfSelect}
            onAddNew={addShelf}
            label="Hedef Raf"
            placeholder="Transfer yapılacak rafı seçin..."
            required
          />

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
                {selectedIds.length > 1
                  ? `${selectedIds.length} Ürün Transfer Et`
                  : 'Transfer Et'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
