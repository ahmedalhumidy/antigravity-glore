import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/stock';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingDown, BarChart3, Users, AlertTriangle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ProductAnalyticsTabProps {
  product: Product;
}

const DAY_NAMES = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function ProductAnalyticsTab({ product }: ProductAnalyticsTabProps) {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const since = subDays(new Date(), 30).toISOString().split('T')[0];
      const { data } = await supabase
        .from('stock_movements')
        .select('movement_type, quantity, movement_date, handled_by, created_at')
        .eq('product_id', product.id)
        .eq('is_deleted', false)
        .gte('movement_date', since)
        .order('movement_date', { ascending: true });
      setMovements(data || []);
      setLoading(false);
    };
    fetch();
  }, [product.id]);

  // 30-day stock trend (running sum from current stock backwards)
  const trendData = useMemo(() => {
    const days: Record<string, { in: number; out: number }> = {};
    for (let i = 30; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      days[d] = { in: 0, out: 0 };
    }
    movements.forEach((m) => {
      if (days[m.movement_date]) {
        if (m.movement_type === 'giris') days[m.movement_date].in += m.quantity;
        else days[m.movement_date].out += m.quantity;
      }
    });

    // Calculate stock level backwards from current
    const entries = Object.entries(days);
    const result: { date: string; label: string; stock: number }[] = [];
    let stock = product.mevcutStok;
    // Go backward from today
    for (let i = entries.length - 1; i >= 0; i--) {
      const [date, { in: inQ, out: outQ }] = entries[i];
      result.unshift({ date, label: format(new Date(date), 'dd MMM', { locale: tr }), stock });
      stock = stock - inQ + outQ; // reverse the effect
    }
    return result;
  }, [movements, product.mevcutStok]);

  // Consumption rate
  const avgDailyOut = useMemo(() => {
    const totalOut = movements.filter(m => m.movement_type === 'cikis').reduce((s, m) => s + m.quantity, 0);
    return totalOut / 30;
  }, [movements]);

  const forecastDays = avgDailyOut > 0
    ? Math.round((product.mevcutStok - product.minStok) / avgDailyOut)
    : null;

  // Movement frequency by day of week
  const frequencyData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    movements.forEach((m) => {
      const day = new Date(m.movement_date).getDay();
      counts[day]++;
    });
    return DAY_NAMES.map((name, i) => ({ name, count: counts[i] }));
  }, [movements]);

  // Top handlers
  const topHandlers = useMemo(() => {
    const map: Record<string, number> = {};
    movements.forEach((m) => {
      map[m.handled_by] = (map[m.handled_by] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [movements]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Forecast Card */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${forecastDays !== null && forecastDays < 14 ? 'text-destructive' : 'text-warning'}`} />
          <div>
            <p className="text-sm font-medium">Tüketim Tahmini</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {avgDailyOut > 0
                ? `Günlük ort. ${avgDailyOut.toFixed(1)} çıkış. ${forecastDays !== null && forecastDays > 0
                    ? `Bu hızla stok ~${forecastDays} gün sonra minimum seviyeye ulaşacak.`
                    : 'Stok zaten minimum seviyenin altında.'}`
                : 'Son 30 günde çıkış hareketi yok.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stock Trend */}
      <Card>
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingDown className="w-4 h-4" /> 30 Günlük Stok Trendi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Line
                  type="monotone"
                  dataKey="stock"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="Stok"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Movement Frequency */}
      <Card>
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Haftalık Hareket Dağılımı
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequencyData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Hareket" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Handlers */}
      {topHandlers.length > 0 && (
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" /> En Aktif Kullanıcılar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {topHandlers.map(([name, count], i) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-4">{i + 1}.</span>
                  <span className="text-sm">{name}</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">{count} işlem</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
