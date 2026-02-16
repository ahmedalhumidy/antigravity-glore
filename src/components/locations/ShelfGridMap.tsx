import { useMemo } from 'react';
import { Product } from '@/types/stock';
import { cn } from '@/lib/utils';
import { Package } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Shelf {
  id: string;
  name: string;
  capacity?: number;
  zone?: string;
}

interface ShelfGridMapProps {
  shelves: Shelf[];
  products: Product[];
  onSelectShelf: (shelfName: string) => void;
}

export function ShelfGridMap({ shelves, products, onSelectShelf }: ShelfGridMapProps) {
  const shelfData = useMemo(() => {
    const productsByShelf: Record<string, Product[]> = {};
    products.forEach(p => {
      if (!productsByShelf[p.rafKonum]) productsByShelf[p.rafKonum] = [];
      productsByShelf[p.rafKonum].push(p);
    });

    return shelves.map(s => {
      const shelfProducts = productsByShelf[s.name] || [];
      const totalStock = shelfProducts.reduce((sum, p) => sum + p.mevcutStok, 0);
      const hasLowStock = shelfProducts.some(p => p.mevcutStok < p.minStok);
      const fillPercent = s.capacity ? Math.min((shelfProducts.length / s.capacity) * 100, 100) : 0;
      return { ...s, products: shelfProducts, totalStock, hasLowStock, fillPercent };
    });
  }, [shelves, products]);

  const zones = useMemo(() => {
    const grouped: Record<string, typeof shelfData> = {};
    shelfData.forEach(s => {
      const zone = s.zone || 'Genel';
      if (!grouped[zone]) grouped[zone] = [];
      grouped[zone].push(s);
    });
    return grouped;
  }, [shelfData]);

  const getFillColor = (fillPercent: number, hasLowStock: boolean) => {
    if (hasLowStock) return 'bg-destructive/15 border-destructive/30 hover:bg-destructive/25';
    if (fillPercent > 80) return 'bg-warning/15 border-warning/30 hover:bg-warning/25';
    if (fillPercent > 0) return 'bg-success/15 border-success/30 hover:bg-success/25';
    return 'bg-muted/50 border-border hover:bg-muted';
  };

  return (
    <div className="space-y-6">
      {Object.entries(zones).map(([zone, zoneShelves]) => (
        <div key={zone}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{zone}</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {zoneShelves.map(shelf => (
              <Tooltip key={shelf.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelectShelf(shelf.name)}
                    className={cn(
                      'aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer',
                      getFillColor(shelf.fillPercent, shelf.hasLowStock)
                    )}
                  >
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[9px] font-medium truncate w-full text-center px-0.5">{shelf.name}</span>
                    <span className="text-[9px] text-muted-foreground">{shelf.products.length}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-semibold">{shelf.name}</p>
                  <p>{shelf.products.length} ürün · {shelf.totalStock} adet</p>
                  {shelf.capacity && <p>Kapasite: %{Math.round(shelf.fillPercent)}</p>}
                  {shelf.hasLowStock && <p className="text-destructive">⚠ Düşük stok var</p>}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
