import { Product } from '@/types/stock';
import { Card } from '@/components/ui/card';
import { StockLevelGauge } from './StockLevelGauge';
import { Package, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface ProductStockCardsProps {
  product: Product;
  sparklineData: { date: string; giris: number; cikis: number }[];
}

export function ProductStockCards({ product, sparklineData }: ProductStockCardsProps) {
  const cards = [
    {
      label: 'Mevcut Stok',
      value: product.mevcutStok,
      icon: Package,
      gauge: true,
      color: product.mevcutStok < product.minStok ? 'text-destructive' : 'text-success',
    },
    {
      label: 'Set Stok',
      value: product.setStok,
      icon: Layers,
      color: 'text-muted-foreground',
    },
    {
      label: 'Toplam Giriş',
      value: product.toplamGiris,
      icon: ArrowUpRight,
      color: 'text-success',
      sparkKey: 'giris' as const,
    },
    {
      label: 'Toplam Çıkış',
      value: product.toplamCikis,
      icon: ArrowDownRight,
      color: 'text-destructive',
      sparkKey: 'cikis' as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="p-3 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">{card.label}</p>
              <p className={cn('text-xl font-bold mt-0.5', card.color)}>{card.value}</p>
            </div>
            {card.gauge ? (
              <StockLevelGauge current={product.mevcutStok} min={product.minStok} size={48} />
            ) : (
              <card.icon className={cn('w-5 h-5 mt-1', card.color)} />
            )}
          </div>
          {card.sparkKey && sparklineData.length > 0 && (
            <div className="h-8 mt-1 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area
                    type="monotone"
                    dataKey={card.sparkKey}
                    stroke={card.sparkKey === 'giris' ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                    fill={card.sparkKey === 'giris' ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--destructive) / 0.1)'}
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
