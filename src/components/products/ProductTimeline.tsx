import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowUpRight, ArrowDownRight, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface TimelineEntry {
  id: string;
  movement_type: string;
  quantity: number;
  movement_date: string;
  movement_time: string;
  handled_by: string;
  notes: string | null;
}

interface ProductTimelineProps {
  productId: string;
}

export function ProductTimeline({ productId }: ProductTimelineProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('stock_movements')
        .select('id, movement_type, quantity, movement_date, movement_time, handled_by, notes')
        .eq('product_id', productId)
        .eq('is_deleted', false)
        .order('movement_date', { ascending: false })
        .order('movement_time', { ascending: false })
        .limit(20);
      setEntries(data || []);
      setLoading(false);
    };
    fetch();
  }, [productId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Henüz hareket kaydı yok</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-1">
        {entries.map((entry) => {
          const isIn = entry.movement_type === 'giris';
          return (
            <div key={entry.id} className="relative flex items-start gap-3 pl-3 py-2">
              <div className={cn(
                'relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                isIn ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
              )}>
                {isIn ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-semibold', isIn ? 'text-success' : 'text-destructive')}>
                    {isIn ? '+' : '-'}{entry.quantity}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.movement_date), 'd MMM yyyy', { locale: tr })}
                  </span>
                  <span className="text-xs text-muted-foreground">{entry.movement_time?.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">{entry.handled_by}</span>
                </div>
                {entry.notes && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{entry.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
