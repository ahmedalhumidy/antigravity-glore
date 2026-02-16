import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowUpRight, ArrowDownRight, Package, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ActivityItem {
  id: string;
  action_type: string;
  created_at: string;
  product_name?: string;
  performer_name?: string;
  quantity?: number;
  movement_type?: string;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    // Fetch recent stock movements as activity
    const { data: movements } = await supabase
      .from('stock_movements')
      .select(`
        id, movement_type, quantity, created_at, handled_by,
        products!inner(urun_adi)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10);

    const items: ActivityItem[] = (movements || []).map((m: any) => ({
      id: m.id,
      action_type: m.movement_type === 'giris' ? 'stock_in' : 'stock_out',
      created_at: m.created_at,
      product_name: m.products?.urun_adi,
      performer_name: m.handled_by,
      quantity: m.quantity,
      movement_type: m.movement_type,
    }));

    setActivities(items);
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_movements' }, () => {
        fetchActivities();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="relative">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <Clock className="w-3.5 h-3.5 text-accent" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
          </div>
          Canlı Aktivite
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />)}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Henüz aktivite yok</p>
        ) : (
          <div className="space-y-1">
            {activities.map((a) => {
              const isIn = a.movement_type === 'giris';
              return (
                <div key={a.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                    isIn ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                  )}>
                    {isIn ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">
                      <span className="font-medium">{a.performer_name}</span>
                      <span className="text-muted-foreground"> {isIn ? 'giriş yaptı' : 'çıkış yaptı'} </span>
                      <span className={cn('font-semibold', isIn ? 'text-success' : 'text-destructive')}>
                        {isIn ? '+' : '-'}{a.quantity}
                      </span>
                      <span className="text-muted-foreground"> — </span>
                      <span className="font-medium">{a.product_name}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: tr })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
