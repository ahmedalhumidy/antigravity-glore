import { useMemo } from 'react';
import { Product, StockMovement } from '@/types/stock';
import { cn } from '@/lib/utils';
import { ShoppingCart, AlertTriangle, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { AnimatedCounter } from '@/components/dashboard/AnimatedCounter';

interface ReorderSuggestionsProps {
    products: Product[];
    movements: StockMovement[];
    onViewProduct?: (id: string) => void;
    className?: string;
}

interface Suggestion {
    product: Product;
    daysLeft: number;
    avgDaily: number;
    suggestedQty: number;
    urgency: 'critical' | 'warning' | 'ok';
    reason: string;
}

export function ReorderSuggestions({ products, movements, onViewProduct, className }: ReorderSuggestionsProps) {
    const suggestions = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Calculate 30-day outgoing per product
        const outByProduct = new Map<string, number>();
        movements
            .filter(m => m.type === 'cikis' && new Date(m.date) >= thirtyDaysAgo)
            .forEach(m => {
                outByProduct.set(m.productId, (outByProduct.get(m.productId) || 0) + m.quantity);
            });

        const results: Suggestion[] = [];

        products.forEach(product => {
            const totalOut30 = outByProduct.get(product.id) || 0;
            const avgDaily = totalOut30 / 30;

            if (avgDaily <= 0) return; // No consumption, skip

            const daysLeft = Math.round(product.mevcutStok / avgDaily);

            // Only suggest for products that will run out within 30 days
            if (daysLeft > 30) return;

            // Suggest ordering 30 days worth of stock
            const suggestedQty = Math.ceil(avgDaily * 30);

            let urgency: Suggestion['urgency'] = 'ok';
            let reason = `${daysLeft} gün sonra bitecek`;

            if (daysLeft <= 3) {
                urgency = 'critical';
                reason = `ACİL: ${daysLeft} gün kaldı!`;
            } else if (daysLeft <= 7) {
                urgency = 'warning';
                reason = `${daysLeft} gün kaldı`;
            }

            results.push({
                product,
                daysLeft,
                avgDaily: Math.round(avgDaily * 10) / 10,
                suggestedQty,
                urgency,
                reason,
            });
        });

        return results
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .slice(0, 8);
    }, [products, movements]);

    return (
        <div className={cn('stat-card p-4', className)}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Sipariş Önerileri</h3>
                </div>
                {suggestions.length > 0 && (
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {suggestions.length} ürün
                    </span>
                )}
            </div>

            {suggestions.length === 0 ? (
                <div className="text-center py-6">
                    <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                        Tüm ürünlerin stok durumu yeterli ✓
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {suggestions.map((s) => (
                        <div
                            key={s.product.id}
                            className={cn(
                                'rounded-lg p-3 border-l-[3px] cursor-pointer transition-colors hover:bg-muted/30',
                                s.urgency === 'critical' ? 'border-l-destructive bg-destructive/5' :
                                    s.urgency === 'warning' ? 'border-l-warning bg-warning/5' :
                                        'border-l-primary bg-primary/5'
                            )}
                            onClick={() => onViewProduct?.(s.product.id)}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        {s.urgency === 'critical' && <AlertTriangle className="w-3 h-3 text-destructive flex-shrink-0" />}
                                        <p className="text-xs font-semibold text-foreground truncate">{s.product.urunAdi}</p>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.reason}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[10px] text-muted-foreground">
                                            Günlük: <span className="font-medium text-foreground">{s.avgDaily}</span>
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            Mevcut: <span className="font-medium text-foreground">{s.product.mevcutStok}</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-lg font-bold text-primary">
                                        <AnimatedCounter value={s.suggestedQty} />
                                    </p>
                                    <p className="text-[9px] text-muted-foreground">adet sipariş</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
