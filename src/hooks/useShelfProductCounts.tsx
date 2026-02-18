import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ShelfProductCount {
  raf_konum: string;
  product_count: number;
}

export const useShelfProductCounts = () => {
  return useQuery<Record<string, number>, Error>({
    queryKey: ['shelfProductCounts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_shelf_product_counts' as any);
      if (error) throw error;
      if (!data) return {};
      const counts: Record<string, number> = {};
      (data as ShelfProductCount[]).forEach(item => {
        counts[item.raf_konum] = Number(item.product_count);
      });
      return counts;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
