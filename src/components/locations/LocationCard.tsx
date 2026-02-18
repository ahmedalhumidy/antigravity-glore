import { MapPin, Package, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { Product } from '@/types/stock';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shelf } from '@/hooks/useShelves';
import { Badge } from '@/components/ui/badge';

interface LocationCardProps {
  location: string;
  products: Product[];
  shelf?: Shelf;
  index: number;
  canManageShelves: boolean;
  serverProductCount?: number;
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
  serverProductCount,
  onViewProduct,
  onEditShelf,
  onDeleteShelf,
}: LocationCardProps) {
  const totalStock = products.reduce((sum, p) => sum + p.mevcutStok, 0);
  const totalSetStock = products.reduce((sum, p) => sum + p.setStok, 0);
  const lowStockCount = products.filter(p => p.mevcutStok < p.minStok).length;

  const capacity = (shelf as any)?.capacity as number | null;
  const zone = (shelf as any)?.zone as string | null;
  const fillPercent = capacity && capacity > 0 ? Math.min(100, Math.round((products.length / capacity) * 100)) : null;

  const fillColor = fillPercent !== null
    ? fillPercent >= 90 ? 'text-destructive' : fillPercent >= 70 ? 'text-warning' : 'text-success'
    : '';

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{location}</h3>
              {zone && (
                <Badge variant="outline" className="text-[10px] h-5 font-normal">
                  {zone}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {serverProductCount ?? products.length} ürün
              {capacity && <span className="ml-1">/ {capacity} kapasite</span>}
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

      {/* Capacity bar */}
      {fillPercent !== null && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Doluluk</span>
            <span className={cn('font-medium', fillColor)}>{fillPercent}%</span>
          </div>
          <Progress value={fillPercent} className="h-1.5" />
        </div>
      )}

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
