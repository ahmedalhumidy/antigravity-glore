import { MapPin, Package, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { Product } from '@/types/stock';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Shelf } from '@/hooks/useShelves';

interface LocationCardProps {
  location: string;
  products: Product[];
  shelf?: Shelf;
  index: number;
  canManageShelves: boolean;
  onViewProduct: (id: string) => void;
  onEditShelf: (id: string, name: string) => void;
  onDeleteShelf: (id: string) => void;
}

export function LocationCard({
  location,
  products,
  shelf,
  index,
  canManageShelves,
  onViewProduct,
  onEditShelf,
  onDeleteShelf,
}: LocationCardProps) {
  const totalStock = products.reduce((sum, p) => sum + p.mevcutStok, 0);
  const totalSetStock = products.reduce((sum, p) => sum + p.setStok, 0);
  const lowStockCount = products.filter(p => p.mevcutStok < p.minStok).length;

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{location}</h3>
            <p className="text-sm text-muted-foreground">
              {products.length} ürün
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <span className="badge-status bg-destructive/10 text-destructive">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {lowStockCount}
            </span>
          )}
          {canManageShelves && shelf && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEditShelf(shelf.id, shelf.name)}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDeleteShelf(shelf.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {products.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {products.map((product) => {
            const isLowStock = product.mevcutStok < product.minStok;
            return (
              <button
                key={product.id}
                onClick={() => onViewProduct(product.id)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{product.urunAdi}</span>
                </div>
                <span className={cn(
                  'text-sm font-medium ml-2 flex-shrink-0',
                  isLowStock ? 'text-destructive' : 'text-foreground'
                )}>
                  {product.mevcutStok}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center">
          <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Bu rafta henüz ürün yok</p>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Toplam</span>
          <div className="text-right">
            <span className="font-semibold text-foreground">{totalStock} adet</span>
            {totalSetStock > 0 && (
              <span className="text-sm text-muted-foreground ml-2">+ {totalSetStock} set</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
