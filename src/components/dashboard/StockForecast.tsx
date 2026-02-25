import { useMemo } from 'react';
import { AlertTriangle, Clock, TrendingDown, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Product, StockMovement } from '@/types/stock';
import { cn } from '@/lib/utils';

interface StockForecastProps {
    products: Product[];
    movements: StockMovement[];
    onViewProduct: (id: string) => void;
}

interface ForecastItem {
    id: string;
    name: string;
    currentStock: number;
    dailyBurnRate: number;
    daysUntilOut: number;
    urgency: 'critical' | 'warning' | 'ok';
}

export function StockForecast({ products, movements, onViewProduct }: StockForecastProps) {
    const forecasts = useMemo(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        const results: ForecastItem[] = [];

        products.forEach(product => {
            if (product.mevcutStok <= 0) return;

            // Calculate burn rate from last 7 days of outgoing movements
            const recentOut = movements.filter(
                m => m.productId === product.id && m.type === 'cikis' && m.date >= sevenDaysAgoStr
            );
            const totalOut = recentOut.reduce((sum, m) => sum + m.quantity, 0);
            const dailyBurnRate = totalOut / 7;

            if (dailyBurnRate <= 0) return;

            const daysUntilOut = Math.round(product.mevcutStok / dailyBurnRate);
            const urgency: ForecastItem['urgency'] =
                daysUntilOut <= 3 ? 'critical' :
                    daysUntilOut <= 7 ? 'warning' :
                        'ok';

            if (daysUntilOut <= 14) {
                results.push({
                    id: product.id,
                    name: product.urunAdi,
                    currentStock: product.mevcutStok,
                    dailyBurnRate: Math.round(dailyBurnRate * 10) / 10,
                    daysUntilOut,
                    urgency,
                });
            }
        });

        return results.sort((a, b) => a.daysUntilOut - b.daysUntilOut).slice(0, 5);
    }, [products, movements]);

    if (forecasts.length === 0) return null;

    const urgencyConfig = {
        critical: {
            color: 'text-destructive',
            bg: 'bg-destructive/10',
            border: 'border-destructive/20',
            label: 'Kritik',
            icon: Flame,
        },
        warning: {
            color: 'text-warning',
            bg: 'bg-warning/10',
            border: 'border-warning/20',
            label: 'Uyarı',
            icon: AlertTriangle,
        },
        ok: {
            color: 'text-info',
            bg: 'bg-info/10',
            border: 'border-info/20',
            label: 'İzleme',
            icon: Clock,
        },
    };

    return (
        <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-destructive/8">
                        <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                    </div>
                    Stok Tahmin
                    <Badge variant="outline" className="text-[10px] h-5 ml-auto font-normal">
                        Son 7 gün verisi
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2.5">
                    {forecasts.map((item) => {
                        const config = urgencyConfig[item.urgency];
                        const UrgencyIcon = config.icon;
                        const fillPercent = Math.max(5, Math.min(100, (item.daysUntilOut / 14) * 100));

                        return (
                            <div
                                key={item.id}
                                className={cn(
                                    'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200 group border',
                                    config.bg,
                                    config.border,
                                    'hover:shadow-sm motion-safe:hover:-translate-y-0.5'
                                )}
                                onClick={() => onViewProduct(item.id)}
                            >
                                <div className={cn('p-1.5 rounded-lg flex-shrink-0', config.bg)}>
                                    <UrgencyIcon className={cn('w-3.5 h-3.5', config.color)} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-medium truncate max-w-[120px]">{item.name}</p>
                                        <span className={cn('text-xs font-bold tabular-nums', config.color)}>
                                            {item.daysUntilOut} gün
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Progress
                                            value={fillPercent}
                                            className="h-1.5 flex-1"
                                        />
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {item.currentStock} adet · ~{item.dailyBurnRate}/gün
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
