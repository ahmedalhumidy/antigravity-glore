import { useMemo, useState, useEffect, useCallback } from 'react';
import { Package, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, Users, Activity, Plus, ArrowLeftRight, Repeat } from 'lucide-react';
import { StatCard } from './StatCard';
import { RecentMovements } from './RecentMovements';
import { LowStockList } from './LowStockList';
import { Product, StockMovement } from '@/types/stock';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { ActivityFeed } from './ActivityFeed';
import { supabase } from '@/integrations/supabase/client';

interface DashboardProps {
  products: Product[];
  movements: StockMovement[];
  onViewProduct: (id: string) => void;
  serverStats?: { total_products: number; total_stock: number; low_stock_count: number };
}

type ChartPeriod = 'today' | 'week' | 'month';

export function Dashboard({ products, movements, onViewProduct, serverStats }: DashboardProps) {
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('week');
  
  const totalProducts = serverStats?.total_products ?? products.length;
  const totalStock = serverStats?.total_stock ?? products.reduce((sum, p) => sum + p.mevcutStok, 0);
  const lowStockCount = serverStats?.low_stock_count ?? products.filter(p => p.mevcutStok < p.minStok).length;
  const lowStockProducts = products.filter(p => p.mevcutStok < p.minStok);
  
  const totalIn = movements.filter(m => m.type === 'giris').reduce((sum, m) => sum + m.quantity, 0);
  const totalOut = movements.filter(m => m.type === 'cikis').reduce((sum, m) => sum + m.quantity, 0);

  // Today's movements
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const todayMovements = movements.filter(m => m.date === today);
  const yesterdayMovements = movements.filter(m => m.date === yesterday);
  
  const todayIn = todayMovements.filter(m => m.type === 'giris').reduce((sum, m) => sum + m.quantity, 0);
  const todayOut = todayMovements.filter(m => m.type === 'cikis').reduce((sum, m) => sum + m.quantity, 0);
  const yesterdayIn = yesterdayMovements.filter(m => m.type === 'giris').reduce((sum, m) => sum + m.quantity, 0);
  const yesterdayOut = yesterdayMovements.filter(m => m.type === 'cikis').reduce((sum, m) => sum + m.quantity, 0);

  // 7-day sparkline data
  const sparkline7d = useMemo(() => {
    const now = new Date();
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = movements.filter(m => m.date === dateStr).length;
      days.push(count);
    }
    return days;
  }, [movements]);

  const sparklineIn7d = useMemo(() => {
    const now = new Date();
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const qty = movements.filter(m => m.date === dateStr && m.type === 'giris').reduce((s, m) => s + m.quantity, 0);
      days.push(qty);
    }
    return days;
  }, [movements]);

  const sparklineOut7d = useMemo(() => {
    const now = new Date();
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const qty = movements.filter(m => m.date === dateStr && m.type === 'cikis').reduce((s, m) => s + m.quantity, 0);
      days.push(qty);
    }
    return days;
  }, [movements]);

  // Avg daily movements (last 7 days)
  const avgDailyMovements = useMemo(() => {
    const total = sparkline7d.reduce((s, v) => s + v, 0);
    return Math.round(total / 7 * 10) / 10;
  }, [sparkline7d]);

  // Stock turnover rate
  const turnoverRate = useMemo(() => {
    if (totalStock === 0) return 0;
    return Math.round((totalOut / totalStock) * 100) / 100;
  }, [totalOut, totalStock]);

  // Chart data based on period
  const chartData = useMemo(() => {
    const now = new Date();
    const days: Record<string, { date: string; giris: number; cikis: number }> = {};
    
    let daysCount = 7;
    if (chartPeriod === 'today') daysCount = 1;
    if (chartPeriod === 'month') daysCount = 30;
    
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days[dateStr] = { date: dateStr, giris: 0, cikis: 0 };
    }
    
    movements.forEach(m => {
      if (days[m.date]) {
        if (m.type === 'giris') {
          days[m.date].giris += m.quantity;
        } else {
          days[m.date].cikis += m.quantity;
        }
      }
    });
    
    return Object.values(days);
  }, [movements, chartPeriod]);

  // Most active products
  const mostActiveProducts = useMemo(() => {
    const activity: Record<string, { id: string; name: string; count: number; totalQty: number }> = {};
    
    movements.forEach(m => {
      if (!activity[m.productId]) {
        activity[m.productId] = { id: m.productId, name: m.productName, count: 0, totalQty: 0 };
      }
      activity[m.productId].count++;
      activity[m.productId].totalQty += m.quantity;
    });
    
    return Object.values(activity).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [movements]);

  // User activity
  const userActivity = useMemo(() => {
    const activity: Record<string, { name: string; count: number }> = {};
    
    movements.forEach(m => {
      if (!activity[m.handledBy]) {
        activity[m.handledBy] = { name: m.handledBy, count: 0 };
      }
      activity[m.handledBy].count++;
    });
    
    return Object.values(activity).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [movements]);

  const periodLabels: Record<ChartPeriod, string> = {
    today: 'Bugün',
    week: 'Bu Hafta',
    month: 'Bu Ay'
  };

  return (
    <div className="space-y-4 md:space-y-5 animate-fade-in pb-safe">
      {/* Primary Actions - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-foreground">Kontrol Paneli</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Stok durumunuza genel bakış</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="shadow-md hover:shadow-lg transition-shadow h-9 px-3 md:px-5 text-sm flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-1.5" />
            Yeni Ürün
          </Button>
          <Button size="sm" variant="outline" className="h-9 px-3 md:px-5 border-primary/20 hover:border-primary/40 text-sm flex-1 sm:flex-none">
            <ArrowLeftRight className="w-4 h-4 mr-1.5" />
            Hareket
          </Button>
        </div>
      </div>

      {/* Stats Grid - Responsive: 2 cols on mobile, 3 on tablet, 6 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
        <StatCard
          title="Toplam Ürün"
          value={totalProducts}
          icon={Package}
          variant="primary"
          compact
        />
        <StatCard
          title="Toplam Stok"
          value={totalStock.toLocaleString('tr-TR')}
          icon={TrendingUp}
          variant="accent"
          compact
        />
        <StatCard
          title="Toplam Giriş"
          value={totalIn.toLocaleString('tr-TR')}
          icon={ArrowUpRight}
          variant="success"
          comparison={{ current: todayIn, previous: yesterdayIn }}
          sparklineData={sparklineIn7d}
          compact
        />
        <StatCard
          title="Toplam Çıkış"
          value={totalOut.toLocaleString('tr-TR')}
          icon={ArrowDownRight}
          variant="warning"
          comparison={{ current: todayOut, previous: yesterdayOut }}
          sparklineData={sparklineOut7d}
          compact
        />
        <StatCard
          title="Bugün"
          value={todayMovements.length}
          icon={Activity}
          comparison={{ current: todayMovements.length, previous: yesterdayMovements.length }}
          sparklineData={sparkline7d}
          compact
        />
        <StatCard
          title="Düşük Stok"
          value={lowStockCount}
          icon={AlertTriangle}
          variant={lowStockCount > 0 ? 'destructive' : 'default'}
          compact
        />
        <StatCard
          title="Ort. Günlük"
          value={avgDailyMovements}
          icon={Repeat}
          compact
        />
        <StatCard
          title="Devir Hızı"
          value={turnoverRate}
          icon={TrendingUp}
          compact
        />
      </div>

      {/* Today's Quick Stats - Mobile optimized */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 min-w-0">
                <p className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">Giriş</p>
                <p className="text-lg md:text-2xl font-bold text-success tabular-nums">+{todayIn}</p>
              </div>
              <div className="p-1.5 md:p-2.5 rounded-lg md:rounded-xl bg-success/8 flex-shrink-0">
                <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 min-w-0">
                <p className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">Çıkış</p>
                <p className="text-lg md:text-2xl font-bold text-destructive tabular-nums">-{todayOut}</p>
              </div>
              <div className="p-1.5 md:p-2.5 rounded-lg md:rounded-xl bg-destructive/8 flex-shrink-0">
                <ArrowDownRight className="w-4 h-4 md:w-5 md:h-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 min-w-0">
                <p className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">Net</p>
                <p className={cn(
                  'text-lg md:text-2xl font-bold tabular-nums',
                  todayIn - todayOut >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {todayIn - todayOut >= 0 ? '+' : ''}{todayIn - todayOut}
                </p>
              </div>
              <div className={cn(
                'p-1.5 md:p-2.5 rounded-lg md:rounded-xl flex-shrink-0',
                todayIn - todayOut >= 0 ? 'bg-success/8' : 'bg-destructive/8'
              )}>
                <TrendingUp className={cn(
                  'w-4 h-4 md:w-5 md:h-5',
                  todayIn - todayOut >= 0 ? 'text-success' : 'text-destructive'
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Stok Hareketleri</CardTitle>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {(['today', 'week', 'month'] as ChartPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setChartPeriod(period)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                  chartPeriod === period 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {periodLabels[period]}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => {
                    if (chartPeriod === 'today') return 'Bugün';
                    return new Date(v).toLocaleDateString('tr-TR', { 
                      weekday: chartPeriod === 'week' ? 'short' : undefined, 
                      day: 'numeric',
                      month: chartPeriod === 'month' ? 'short' : undefined
                    });
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  labelFormatter={(v) => new Date(v).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '8px' }} />
                <Bar dataKey="giris" name="Giriş" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cikis" name="Çıkış" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Three Column Layout - Reduced gap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Most Active Products */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/8">
                <Activity className="w-3.5 h-3.5 text-primary" />
              </div>
              En Aktif Ürünler
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {mostActiveProducts.map((p, i) => (
                <div 
                  key={p.id} 
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                  onClick={() => onViewProduct(p.id)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-105',
                      i === 0 ? 'bg-primary text-primary-foreground' : 
                      i === 1 ? 'bg-secondary text-secondary-foreground' : 
                      'bg-muted text-muted-foreground'
                    )}>
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-[100px]">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.totalQty} adet</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5">{p.count}</Badge>
                </div>
              ))}
              {mostActiveProducts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Henüz hareket yok</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Activity Summary */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <Users className="w-3.5 h-3.5 text-accent" />
              </div>
              Kullanıcı Aktivitesi
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {userActivity.map((u) => (
                <div key={u.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">{u.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <p className="text-sm font-medium truncate max-w-[100px]">{u.name}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5">{u.count}</Badge>
                </div>
              ))}
              {userActivity.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Henüz aktivite yok</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <RecentMovements movements={movements.slice(0, 5)} />
      </div>

      {/* Activity Feed */}
      <ActivityFeed />

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <LowStockList products={lowStockProducts} onViewProduct={onViewProduct} />
      )}
    </div>
  );
}
