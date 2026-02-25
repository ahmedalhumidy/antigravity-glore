import { useMemo } from 'react';
import { Product, StockMovement } from '@/types/stock';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, LineChart } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip as RTooltip, XAxis } from 'recharts';

interface DemandForecastChartProps {
    products: Product[];
    movements: StockMovement[];
    className?: string;
}

export function DemandForecastChart({ products, movements, className }: DemandForecastChartProps) {
    const forecast = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Historical daily outgoing totals (last 30 days)
        const dailyOut = new Map<string, number>();
        movements
            .filter(m => m.type === 'cikis' && new Date(m.date) >= thirtyDaysAgo)
            .forEach(m => {
                const day = m.date.split('T')[0];
                dailyOut.set(day, (dailyOut.get(day) || 0) + m.quantity);
            });

        // Build historical chart data
        const historyData: { date: string; label: string; actual: number; forecast?: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const key = d.toISOString().split('T')[0];
            const label = `${d.getDate()}/${d.getMonth() + 1}`;
            historyData.push({
                date: key,
                label,
                actual: dailyOut.get(key) || 0,
            });
        }

        // Calculate average daily demand and trend
        const recentDays = historyData.slice(-7);
        const olderDays = historyData.slice(0, 23);
        const recentAvg = recentDays.reduce((s, d) => s + d.actual, 0) / 7;
        const olderAvg = olderDays.reduce((s, d) => s + d.actual, 0) / 23;
        const trendMultiplier = olderAvg > 0 ? recentAvg / olderAvg : 1;
        const avgDaily = recentAvg || (olderAvg * trendMultiplier) || 0;

        // Generate 30-day forecast
        const forecastData: { date: string; label: string; actual?: number; forecast: number }[] = [];
        for (let i = 1; i <= 30; i++) {
            const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
            const label = `${d.getDate()}/${d.getMonth() + 1}`;
            const variation = 0.8 + Math.random() * 0.4;
            const dayForecast = Math.round(avgDaily * trendMultiplier * variation);
            forecastData.push({
                date: d.toISOString().split('T')[0],
                label,
                forecast: Math.max(0, dayForecast),
            });
        }

        const lastHistory = historyData[historyData.length - 1];
        const combined = [
            ...historyData.map(d => ({ ...d, forecast: undefined })),
            { ...lastHistory, forecast: lastHistory.actual },
            ...forecastData,
        ];

        const totalForecast30 = forecastData.reduce((s, d) => s + d.forecast, 0);
        const totalCurrentStock = products.reduce((s, p) => s + p.mevcutStok, 0);
        const daysUntilDepleted = avgDaily > 0 ? Math.round(totalCurrentStock / avgDaily) : Infinity;
        const trend = trendMultiplier > 1.1 ? 'up' : trendMultiplier < 0.9 ? 'down' : 'stable';

        return {
            chartData: combined,
            avgDaily: Math.round(avgDaily),
            totalForecast30: Math.round(totalForecast30),
            daysUntilDepleted,
            trend,
            trendPercent: Math.round((trendMultiplier - 1) * 100),
        };
    }, [products, movements]);

    return (
        <div className={cn('stat-card p-4', className)}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Talep Tahmini</h3>
                </div>
                <div className="flex items-center gap-1.5">
                    {forecast.trend === 'up' ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                            <TrendingUp className="w-3 h-3" />
                            +{forecast.trendPercent}%
                        </span>
                    ) : forecast.trend === 'down' ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-success bg-success/10 px-1.5 py-0.5 rounded-full">
                            <TrendingDown className="w-3 h-3" />
                            {forecast.trendPercent}%
                        </span>
                    ) : (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            Sabit
                        </span>
                    )}
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{forecast.avgDaily}</p>
                    <p className="text-[10px] text-muted-foreground">Günlük Ort. Çıkış</p>
                </div>
                <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{forecast.totalForecast30.toLocaleString('tr-TR')}</p>
                    <p className="text-[10px] text-muted-foreground">30 Gün Tahmini</p>
                </div>
                <div className="text-center">
                    <p className={cn(
                        'text-lg font-bold',
                        forecast.daysUntilDepleted < 30 ? 'text-destructive' : 'text-success'
                    )}>
                        {forecast.daysUntilDepleted === Infinity ? '∞' : forecast.daysUntilDepleted}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Gün Kaldı</p>
                </div>
            </div>

            {/* Chart */}
            <div className="h-40 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecast.chartData}>
                        <defs>
                            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                            interval={9}
                            axisLine={false}
                            tickLine={false}
                        />
                        <RTooltip
                            contentStyle={{
                                background: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '11px',
                            }}
                            formatter={(val: number, name: string) => [
                                val,
                                name === 'actual' ? 'Gerçek' : 'Tahmin',
                            ]}
                        />
                        <Area
                            type="monotone"
                            dataKey="actual"
                            stroke="hsl(var(--primary))"
                            fill="url(#actualGradient)"
                            strokeWidth={1.5}
                            dot={false}
                        />
                        <Area
                            type="monotone"
                            dataKey="forecast"
                            stroke="hsl(var(--accent))"
                            fill="url(#forecastGradient)"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            dot={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded bg-primary" />
                    <span className="text-[10px] text-muted-foreground">Gerçek</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded bg-accent border-dashed" style={{ borderTop: '1.5px dashed' }} />
                    <span className="text-[10px] text-muted-foreground">Tahmin</span>
                </div>
            </div>
        </div>
    );
}
