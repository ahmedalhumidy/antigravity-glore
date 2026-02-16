import { Product } from '@/types/stock';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StockLevelGauge } from './StockLevelGauge';
import { ProductTimeline } from './ProductTimeline';
import { printBarcodeLabels } from './BarcodeLabel';
import { Package, MapPin, Printer, ArrowUpRight, ArrowDownRight, Edit2, Barcode, Hash, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategoryColor } from './CategoryFilter';

interface ProductDetailDrawerProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (product: Product) => void;
  onStockAction?: (product: Product, type: 'giris' | 'cikis') => void;
}

export function ProductDetailDrawer({ product, open, onClose, onEdit, onStockAction }: ProductDetailDrawerProps) {
  if (!product) return null;

  const isLowStock = product.mevcutStok < product.minStok;
  const category = (product as any).category;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-b from-primary/5 to-transparent">
          <SheetHeader className="mb-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-lg leading-tight">{product.urunAdi}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm text-muted-foreground">{product.urunKodu}</span>
                  {category && (
                    <Badge variant="outline" className={cn('text-[10px]', getCategoryColor(category))}>
                      {category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {onStockAction && (
              <>
                <Button size="sm" className="flex-1 bg-success hover:bg-success/90 text-success-foreground" onClick={() => onStockAction(product, 'giris')}>
                  <ArrowUpRight className="w-4 h-4 mr-1" /> Giriş
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => onStockAction(product, 'cikis')}>
                  <ArrowDownRight className="w-4 h-4 mr-1" /> Çıkış
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => printBarcodeLabels([product])}>
              <Printer className="w-4 h-4" />
            </Button>
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(product)}>
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Stock Gauge */}
        <div className="p-6 flex flex-col items-center">
          <StockLevelGauge current={product.mevcutStok} min={product.minStok} />
          <div className="mt-3 flex items-center gap-1">
            {isLowStock ? (
              <Badge variant="destructive" className="text-xs">Stok Düşük</Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">Normal</Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Details Grid */}
        <div className="p-6 grid grid-cols-2 gap-4">
          <DetailItem icon={MapPin} label="Konum" value={product.rafKonum} />
          <DetailItem icon={Barcode} label="Barkod" value={product.barkod || '—'} />
          <DetailItem icon={Hash} label="Set Stok" value={String(product.setStok)} />
          <DetailItem icon={ArrowUpRight} label="Toplam Giriş" value={String(product.toplamGiris)} />
          <DetailItem icon={ArrowDownRight} label="Toplam Çıkış" value={String(product.toplamCikis)} />
          <DetailItem icon={Calendar} label="Son İşlem" value={product.sonIslemTarihi ? new Date(product.sonIslemTarihi).toLocaleDateString('tr-TR') : '—'} />
        </div>

        {product.not && (
          <>
            <Separator />
            <div className="p-6">
              <p className="text-xs font-medium text-muted-foreground mb-1">Not</p>
              <p className="text-sm">{product.not}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Timeline */}
        <div className="p-6">
          <h3 className="text-sm font-semibold mb-4">Hareket Geçmişi</h3>
          <ProductTimeline productId={product.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
