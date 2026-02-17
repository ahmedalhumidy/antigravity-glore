import { useState } from 'react';
import { Minus, Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useGlobalScanner } from './GlobalScannerProvider';
import { ShelfSelector } from '@/components/shelves/ShelfSelector';
import { useShelves } from '@/hooks/useShelves';
import { stockService } from '@/services/stockService';
import { Product } from '@/types/stock';
import { toast } from 'sonner';
import { BatchActionType } from './types';
import { ScrollArea } from '@/components/ui/scroll-area';

export function BatchQueuePanel({ products }: { products: Product[] }) {
  const { batchQueue, updateQueueQuantity, removeFromQueue, clearQueue, closeScanner } = useGlobalScanner();
  const { shelves, addShelf } = useShelves();
  const [actionType, setActionType] = useState<BatchActionType>('giris');
  const [selectedShelfId, setSelectedShelfId] = useState<string>('');
  const [selectedShelfName, setSelectedShelfName] = useState<string>('');
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);

  const validItems = batchQueue.filter(q => q.found);

  const handleApply = async () => {
    if (validItems.length === 0) {
      toast.error('Kuyrukte geçerli ürün yok');
      return;
    }

    if ((actionType === 'giris' || actionType === 'cikis') && !selectedShelfId) {
      toast.error('Lütfen raf seçin');
      return;
    }

    // Check negative stock for cikis
    if (actionType === 'cikis') {
      const negativeItems = validItems.filter(item => {
        const product = item.product;
        return product && item.quantity > product.mevcutStok;
      });
      if (negativeItems.length > 0) {
        const names = negativeItems.map(i => i.product?.urunAdi).join(', ');
        toast.error(`Yetersiz stok: ${names}`);
        return;
      }
    }

    setApplying(true);
    setProgress(0);
    let successCount = 0;

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      if (!item.product) continue;

      try {
        if (actionType === 'giris' || actionType === 'cikis') {
          const now = new Date();
          await stockService.createMovement({
            productId: item.product.id,
            type: actionType,
            quantity: item.quantity,
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().slice(0, 5),
            shelfId: selectedShelfId,
          });
          successCount++;
        } else if (actionType === 'transfer') {
          await stockService.transferShelf({
            productId: item.product.id,
            fromShelfName: item.product.rafKonum,
            toShelfId: selectedShelfId,
            toShelfName: selectedShelfName,
          });
          successCount++;
        }
      } catch (err) {
        console.error('Batch item error:', err);
      }

      setProgress(((i + 1) / validItems.length) * 100);
    }

    setApplying(false);
    toast.success(`${successCount}/${validItems.length} işlem tamamlandı`);
    clearQueue();
    closeScanner();
  };

  return (
    <div className="border-t border-border">
      {/* Action Type + Shelf */}
      <div className="p-3 space-y-3 border-b border-border bg-muted/30">
        <div className="flex gap-2">
          <Select value={actionType} onValueChange={(v) => setActionType(v as BatchActionType)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="giris">Stok Girişi</SelectItem>
              <SelectItem value="cikis">Stok Çıkışı</SelectItem>
              <SelectItem value="transfer">Raf Taşı</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ShelfSelector
          shelves={shelves}
          selectedShelfId={selectedShelfId}
          onSelect={(shelf) => { setSelectedShelfId(shelf.id); setSelectedShelfName(shelf.name); }}
          onAddNew={addShelf}
          label=""
          placeholder="Hedef raf seçin..."
          required
        />
      </div>

      {/* Queue List */}
      <ScrollArea className="max-h-[200px]">
        <div className="p-2 space-y-1">
          {batchQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Henüz barkod taranmadı
            </p>
          ) : (
            batchQueue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border"
              >
                <div className="flex-1 min-w-0">
                  {item.found ? (
                    <p className="text-sm font-medium truncate">{item.product?.urunAdi}</p>
                  ) : (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <p className="text-sm text-amber-500 truncate">{item.barcode}</p>
                    </div>
                  )}
                </div>

                {item.found && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQueueQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQueueQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeFromQueue(item.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Apply */}
      {batchQueue.length > 0 && (
        <div className="p-3 border-t border-border space-y-2">
          {applying && <Progress value={progress} className="h-2" />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearQueue} disabled={applying}>
              Temizle
            </Button>
            <Button
              className="flex-1"
              size="sm"
              onClick={handleApply}
              disabled={applying || validItems.length === 0}
            >
              {applying ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Uygula ({validItems.length})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
