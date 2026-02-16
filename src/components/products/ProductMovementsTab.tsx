import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpRight, ArrowDownRight, User, MapPin, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Movement {
  id: string;
  movement_type: string;
  quantity: number;
  set_quantity: number;
  movement_date: string;
  movement_time: string;
  handled_by: string;
  notes: string | null;
  shelf_id: string | null;
  created_at: string;
}

interface ProductMovementsTabProps {
  productId: string;
  totalIn: number;
  totalOut: number;
}

export function ProductMovementsTab({ productId, totalIn, totalOut }: ProductMovementsTabProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('movement_type', filter);
      }

      const { data } = await query;
      setMovements(data || []);
      setLoading(false);
    };
    fetch();
  }, [productId, filter]);

  const total = totalIn + totalOut;
  const inPct = total > 0 ? (totalIn / total) * 100 : 50;

  return (
    <div className="space-y-4">
      {/* Summary Ratio Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-success flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> Giriş: {totalIn}</span>
          <span className="text-destructive flex items-center gap-1"><ArrowDownRight className="w-3 h-3" /> Çıkış: {totalOut}</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
          <div className="bg-success transition-all duration-500" style={{ width: `${inPct}%` }} />
          <div className="bg-destructive transition-all duration-500" style={{ width: `${100 - inPct}%` }} />
        </div>
      </div>

      {/* Filter */}
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-40 h-10 sm:h-8 text-sm sm:text-xs rounded-lg">
          <SelectValue placeholder="Filtrele" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tümü</SelectItem>
          <SelectItem value="giris">Giriş</SelectItem>
          <SelectItem value="cikis">Çıkış</SelectItem>
        </SelectContent>
      </Select>

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : movements.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground">Hareket bulunamadı</p>
      ) : (
        <ScrollArea className="h-[400px] pr-2">
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-3">
              {movements.map((m) => {
                const isIn = m.movement_type === 'giris';
                return (
                  <div key={m.id} className="relative">
                    <div className={cn(
                      'absolute -left-4 top-3 w-2.5 h-2.5 rounded-full border-2 border-background',
                      isIn ? 'bg-success' : 'bg-destructive'
                    )} />
                    <div className="p-3.5 sm:p-3 rounded-xl sm:rounded-lg bg-muted/30 border active:scale-[0.99] transition-transform">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={isIn ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">
                            {isIn ? '+' : '-'}{m.quantity} {m.set_quantity > 0 ? `(${m.set_quantity} set)` : ''}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{isIn ? 'Giriş' : 'Çıkış'}</Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: tr })}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1.5">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{m.handled_by}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(m.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}</span>
                      </div>
                      {m.notes && <p className="text-xs mt-1.5 text-muted-foreground italic">{m.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
