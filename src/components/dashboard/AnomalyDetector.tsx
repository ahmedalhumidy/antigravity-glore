import { useMemo } from 'react';
import { Product, StockMovement } from '@/types/stock';
import { cn } from '@/lib/utils';
import { AlertTriangle, TrendingUp, TrendingDown, Zap, ShieldAlert } from 'lucide-react';

interface AnomalyDetectorProps {
    products: Product[];
    movements: StockMovement[];
    className?: string;
}

interface Anomaly {
    type: 'spike' | 'unusual_time' | 'bulk_removal' | 'zero_stuck';
    severity: 'critical' | 'warning' | 'info';
    product: Product;
    message: string;
    detail: string;
}

export function AnomalyDetector({ products, movements, className }: AnomalyDetectorProps) {
    const anomalies = useMemo(() => {
        const results: Anomaly[] = [];
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const recentMovements = movements.filter(
            m => new Date(m.date) >= sevenDaysAgo
        );
        const olderMovements = movements.filter(
            m => new Date(m.date) >= thirtyDaysAgo && new Date(m.date) < sevenDaysAgo
        );

        // Group by product
        const recentByProduct = new Map<string, StockMovement[]>();
        recentMovements.forEach(m => {
            const list = recentByProduct.get(m.productId) || [];
            list.push(m);
            recentByProduct.set(m.productId, list);
        });

        const olderByProduct = new Map<string, StockMovement[]>();
        olderMovements.forEach(m => {
            const list = olderByProduct.get(m.productId) || [];
            list.push(m);
            olderByProduct.set(m.productId, list);
        });

        products.forEach(product => {
            const recent = recentByProduct.get(product.id) || [];
            const older = olderByProduct.get(product.id) || [];

            // 1. Spike detection: 3x more outgoing than average
            const recentOut = recent.filter(m => m.type === 'cikis').reduce((s, m) => s + m.quantity, 0);
            const olderOut = older.filter(m => m.type === 'cikis').reduce((s, m) => s + m.quantity, 0);
            const avgWeeklyOut = olderOut / 3;

            if (avgWeeklyOut > 0 && recentOut > avgWeeklyOut * 3 && recentOut > 10) {
                results.push({
                    type: 'spike',
                    severity: 'warning',
                    product,
                    message: 'Çıkış artışı tespit edildi',
                    detail: `Bu hafta ${recentOut} çıkış (ortalama: ${Math.round(avgWeeklyOut)}/hafta)`,
                });
            }

            // 2. Bulk removal: single large outgoing transaction (>50% of stock)
            recent.forEach(m => {
                if (m.type === 'cikis' && m.quantity > product.acilisStok * 0.5 && m.quantity > 20) {
                    results.push({
                        type: 'bulk_removal',
                        severity: 'critical',
                        product,
                        message: 'Büyük stok çıkışı',
                        detail: `Tek seferde ${m.quantity} adet çıkış yapıldı`,
                    });
                }
            });

            // 3. Zero stuck: stock at 0 for 7+ days with no incoming
            if (product.mevcutStok === 0) {
                const hasRecentIn = recent.some(m => m.type === 'giris');
                if (!hasRecentIn && olderOut > 0) {
                    results.push({
                        type: 'zero_stuck',
                        severity: 'critical',
                        product,
                        message: 'Stok 7+ gündür sıfır',
                        detail: 'Giriş yapılması gerekebilir',
                    });
                }
            }
        });

        return results.sort((a, b) => {
            const severityOrder = { critical: 0, warning: 1, info: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        }).slice(0, 10);
    }, [products, movements]);

    if (anomalies.length === 0) {
        return (
            <div className={cn('stat-card p-4', className)}>
                <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="w-4 h-4 text-success" />
                    <h3 className="text-sm font-semibold">Anomali Tespiti</h3>
                </div>
                <p className="text-xs text-muted-foreground text-center py-6">
                    Son 7 günde anormal bir hareket tespit edilmedi ✓
                </p>
            </div>
        );
    }

    const iconMap = {
        spike: TrendingUp,
        unusual_time: Zap,
        bulk_removal: TrendingDown,
        zero_stuck: AlertTriangle,
    };

    const severityColors = {
        critical: 'border-l-destructive bg-destructive/5',
        warning: 'border-l-warning bg-warning/5',
        info: 'border-l-primary bg-primary/5',
    };

    return (
        <div className={cn('stat-card p-4', className)}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-warning" />
                    <h3 className="text-sm font-semibold">Anomali Tespiti</h3>
                </div>
                <span className="text-[10px] font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                    {anomalies.length} uyarı
                </span>
            </div>

            <div className="space-y-2">
                {anomalies.map((anomaly, i) => {
                    const Icon = iconMap[anomaly.type];
                    return (
                        <div
                            key={i}
                            className={cn(
                                'rounded-lg border-l-[3px] p-3 transition-colors',
                                severityColors[anomaly.severity]
                            )}
                        >
                            <div className="flex items-start gap-2.5">
                                <Icon className={cn(
                                    'w-4 h-4 mt-0.5 flex-shrink-0',
                                    anomaly.severity === 'critical' ? 'text-destructive' : 'text-warning'
                                )} />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-foreground">{anomaly.message}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">{anomaly.product.urunAdi}</p>
                                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{anomaly.detail}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
