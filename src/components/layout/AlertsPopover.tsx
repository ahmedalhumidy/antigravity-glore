import { Bell, AlertTriangle, Package } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Product } from '@/types/stock';
import { useState } from 'react';

interface AlertsPopoverProps {
  products: Product[];
  pendingSyncCount: number;
  onRestockProduct: (product: Product) => void;
  onViewProduct: (id: string) => void;
}

export function AlertsPopover({ products, pendingSyncCount, onRestockProduct, onViewProduct }: AlertsPopoverProps) {
  const [open, setOpen] = useState(false);

  const lowStockProducts = products
    .filter(p => p.mevcutStok < p.minStok)
    .sort((a, b) => a.mevcutStok - b.mevcutStok)
    .slice(0, 8);

  const totalAlerts = lowStockProducts.length + (pendingSyncCount > 0 ? 1 : 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors touch-feedback" title="Uyarılar">
          <Bell className="w-5 h-5 text-foreground" />
          {totalAlerts > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {totalAlerts > 99 ? '99+' : totalAlerts}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0" sideOffset={8}>
        <div className="px-3 py-2.5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Aktif Uyarılar</h3>
        </div>
        <ScrollArea className="max-h-64">
          {pendingSyncCount > 0 && (
            <div className="flex items-center gap-2.5 px-3 py-2 border-b border-border bg-warning/5">
              <div className="w-7 h-7 rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{pendingSyncCount} bekleyen senkronizasyon</p>
              </div>
            </div>
          )}
          {lowStockProducts.length === 0 && pendingSyncCount === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">Aktif uyarı yok</div>
          )}
          {lowStockProducts.map(p => (
            <button
              key={p.id}
              className="flex items-center gap-2.5 px-3 py-2 w-full text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
              onClick={() => { setOpen(false); onRestockProduct(p); }}
            >
              <div className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-3.5 h-3.5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{p.urunAdi}</p>
                <p className="text-[10px] text-muted-foreground">Stok: {p.mevcutStok} / Min: {p.minStok}</p>
              </div>
              <span className="text-[10px] font-medium text-accent flex-shrink-0">Yenile</span>
            </button>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
