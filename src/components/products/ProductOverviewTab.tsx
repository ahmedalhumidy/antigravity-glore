import { useEffect, useRef } from 'react';
import { Product } from '@/types/stock';
import { ProductStockCards } from './ProductStockCards';
import { Badge } from '@/components/ui/badge';
import { MapPin, Barcode, Calendar, TrendingDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategoryColor } from './CategoryFilter';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import JsBarcode from 'jsbarcode';

interface ProductOverviewTabProps {
  product: Product;
  sparklineData: { date: string; giris: number; cikis: number }[];
  avgDailyConsumption: number;
}

export function ProductOverviewTab({ product, sparklineData, avgDailyConsumption }: ProductOverviewTabProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const barcodeValue = product.barkod || product.urunKodu;
  const isLowStock = product.mevcutStok < product.minStok;

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 4,
          background: 'transparent',
          lineColor: 'currentColor',
        });
      } catch {
        // invalid barcode
      }
    }
  }, [barcodeValue]);

  const daysSinceLastMovement = product.sonIslemTarihi
    ? differenceInDays(new Date(), new Date(product.sonIslemTarihi))
    : null;

  const facts = [
    { icon: MapPin, label: 'Raf Konumu', value: product.rafKonum },
    { icon: Barcode, label: 'Barkod', value: barcodeValue },
    {
      icon: Calendar,
      label: 'Son İşlem',
      value: product.sonIslemTarihi
        ? formatDistanceToNow(new Date(product.sonIslemTarihi), { addSuffix: true, locale: tr })
        : '—',
    },
    {
      icon: Clock,
      label: 'Son Hareketten Bu Yana',
      value: daysSinceLastMovement !== null ? `${daysSinceLastMovement} gün` : '—',
    },
    {
      icon: TrendingDown,
      label: 'Günlük Tüketim Ort.',
      value: avgDailyConsumption > 0 ? avgDailyConsumption.toFixed(1) : '—',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Hero Header with Barcode */}
      <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl bg-muted/30 border">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold truncate">{product.urunAdi}</h2>
            {isLowStock && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
              </span>
            )}
          </div>
          <p className="font-mono text-sm text-muted-foreground mt-0.5">{product.urunKodu}</p>
          <div className="flex gap-2 mt-2">
            {product.category && (
              <Badge variant="outline" className={cn('text-[10px]', getCategoryColor(product.category))}>
                {product.category}
              </Badge>
            )}
            {isLowStock ? (
              <Badge variant="destructive" className="text-[10px]">Stok Düşük</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">Normal</Badge>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 bg-background rounded-lg p-2 border">
          <svg ref={barcodeRef} className="text-foreground" />
        </div>
      </div>

      {/* Stock Intelligence Cards */}
      <ProductStockCards product={product} sparklineData={sparklineData} />

      {/* Quick Facts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {facts.map((fact) => (
          <div key={fact.label} className="flex items-start gap-2.5 p-3.5 sm:p-3 rounded-xl sm:rounded-lg bg-muted/30 border min-h-[52px] active:scale-[0.98] transition-transform">
            <fact.icon className="w-4.5 h-4.5 sm:w-4 sm:h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] sm:text-[10px] text-muted-foreground">{fact.label}</p>
              <p className="text-sm font-medium truncate">{fact.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {product.not && (
        <div className="p-3 rounded-lg bg-muted/30 border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Not</p>
          <p className="text-sm">{product.not}</p>
        </div>
      )}
    </div>
  );
}
